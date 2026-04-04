# Chrome Extension App

This app adds a Manifest V3 Chrome extension under `apps/chrome-extension`.

It is designed as an MDP client:

- the background service worker connects to an MDP server
- the extension exposes canonical Chrome extension paths for tab management, notifications, and config status
- matched pages receive a content script for DOM operations
- the extension can inject a main-world bridge so page-local scripts can register paths through `window.__MDP_EXTENSION_BRIDGE__`
- default managed page scripts are deduplicated per page load so the same bootstrap script is not re-run on every command

## Build

```bash
pnpm --filter @modeldriveprotocol/chrome-extension build
```

This app now uses [WXT](https://wxt.dev/) for extension development and packaging.

## Local development

Choose the loop that matches how you want to debug:

- `dev`: WXT launches a dedicated Chrome for you
- `dev:manual`: WXT watches and rebuilds, but you load the extension into your own Chrome
- `build`: one-off production-style unpacked build
- `paths`: print the exact local directories for manual loading and the persistent dev profile

Quick path check:

```bash
pnpm --filter @modeldriveprotocol/chrome-extension paths
```

Use WXT dev mode during local iteration:

```bash
pnpm --filter @modeldriveprotocol/chrome-extension dev
```

That starts Chrome with the extension loaded in an isolated development profile, so UI and runtime changes can be checked locally without rebuilding by hand.

If you want to keep using your own Chrome and load the extension manually, use:

```bash
pnpm --filter @modeldriveprotocol/chrome-extension dev:manual
```

That runs the WXT dev pipeline without auto-launching a browser. Then load
`apps/chrome-extension/dist/chrome-mv3-dev` yourself from `chrome://extensions`.
The WXT config also keeps a persistent Chromium profile under `apps/chrome-extension/.wxt/chrome-data`, so local login state and browser-side dev settings survive restarts.

If you are working in VSCode, the root workspace also includes:

- task: `mdp:chrome-extension dev`
- task: `mdp:chrome-extension dev (manual load)`
- task: `mdp:chrome-extension paths`
- launch config: `MDP Chrome Extension (WXT Dev)`
- launch config: `MDP Chrome Extension (Manual Load)`

If you want personal runner overrides without committing them, create
`apps/chrome-extension/web-ext.config.ts`. This path is gitignored. Typical uses:

- disable auto-launched browser and load the unpacked extension yourself
- point WXT at a different Chrome/Chromium binary
- use your own local profile or startup URLs

An example template is checked in at
`apps/chrome-extension/web-ext.config.example.ts`.

For a production-style unpacked build, WXT writes output to:

```bash
apps/chrome-extension/dist/chrome-mv3
```

In manual dev mode, WXT writes the development build to:

```bash
apps/chrome-extension/dist/chrome-mv3-dev
```

## GitHub Actions

- `.github/workflows/chrome-extension-ci.yml`
  runs on pull requests, pushes to `main`, and manual dispatch when the extension or its shared client/protocol dependencies change. It typechecks, tests, builds with WXT, packages `dist/chrome-mv3` into a zip, and uploads the artifact.
- `.github/workflows/chrome-extension-release.yml`
  runs on tags that match `chrome-extension-v*`. It validates that the tag version matches `apps/chrome-extension/package.json`, builds the extension with WXT, checks the generated manifest version, and packages the extension zip. When `CHROME_WEB_STORE_*` repository variables and secrets are configured, it also uploads the zip to the Chrome Web Store and submits the item for publishing before creating or updating the GitHub release.

Example release tag:

```bash
git tag chrome-extension-v1.0.0
git push origin chrome-extension-v1.0.0
```

## Load In Chrome

1. Open `chrome://extensions`
2. Enable Developer mode
3. Choose Load unpacked
4. Select `apps/chrome-extension/dist/chrome-mv3`

## Configure

Open the extension options page and configure a workspace:

- one shared `MDP Server URL`
- one singleton background client for browser-level endpoint paths such as tabs, notifications, and config status
- one or more route-scoped clients with host match patterns plus path rules such as `https://app.example.com/*` + `/billing`
- optional default bridge scripts for each route client
- route-local skill entries, selector resources, and recorded flows

Saving the options page requests host permissions for every configured route-client pattern.

## Real End-To-End Validation

When you need proof against a real browser and a real MCP caller, prefer this loop:

```bash
MDP_WXT_MANUAL=1 pnpm --filter @modeldriveprotocol/chrome-extension dev -- --port 3001
node packages/server/dist/cli.js --port 47372
```

Then launch your own Chrome against the persistent WXT profile with DevTools Protocol enabled and point the options page at `ws://127.0.0.1:47372`.

Drive the scenario through a real MCP consumer such as a small Node script using `@ai-sdk/mcp`, `listClients`, and `callPath`.
For workspace-management writes, expect a brief disconnect while the extension runtime refreshes and retry once `mdp-chrome-workspace` shows up in `listClients` again.

For screenshots, do not trust the page title alone.
If the extension page body is empty, inspect the HTML and make sure WXT is serving the same `localhost:<port>` referenced by the injected script tags before capturing.

Remove temporary clients, route rules, and `.artifacts/**` evidence after the run unless the task explicitly asks to keep them.

The popup now acts as a quick control surface:

- pick the active route client for the current page
- grant host access for the selected route client
- inject the bridge and route-managed page script
- start/stop a recorded flow
- capture an element selector into a serializable route resource

## Page Path Injection

Injected page scripts can register paths like this:

```js
window.__MDP_EXTENSION_BRIDGE__.registerPath('/app/state', () => {
  return window.app.store.getState()
})
```

After injection, each route-scoped client exposes canonical MDP paths such as:

- `GET /page/injected-paths`
- `POST /page/call-injected-path`
- `POST /page/run-main-world-script`
- `POST /page/inject-path-script`
- `GET /page/injected-state`
- `POST /page/click`
- `POST /page/fill`
- `POST /page/focus`
- `POST /page/press-key`
- `POST /page/scroll-into-view`
- `POST /page/scroll-to`
- `POST /page/wait-for-text`
- `POST /page/wait-for-selector`
- `POST /page/wait-for-visible`
- `POST /page/wait-for-hidden`
- `POST /page/wait-for-url`
- `POST /page/snapshot`

Recorded flows are exposed back through MDP on their configured canonical flow paths, selector captures
are exposed on their configured canonical GET paths, and skill entries are published as hierarchical MDP skills.

The popup also surfaces bridge health for the active tab, the currently matched route clients, and
the latest selector capture / recording session state.

Background resource readers can also fetch:

- `GET /extension/resources/status`
- `GET /extension/resources/config`
- `GET /extension/resources/tabs`

It also exposes extension-oriented endpoint paths such as:

- `GET /extension/status`
- `GET /extension/tabs`
- `POST /extension/create-tab`
- `POST /extension/close-tab`
- `POST /extension/activate-tab`
- `POST /extension/show-notification`
