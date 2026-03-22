# Chrome Extension App

This app adds a Manifest V3 Chrome extension under `apps/chrome-extension`.

It is designed as an MDP client:

- the background service worker connects to an MDP server
- the extension exposes Chrome extension tools such as tab management, notifications, and config status
- matched pages receive a content script for DOM operations
- the extension can inject a main-world bridge so page-local scripts can register tools through `window.__MDP_EXTENSION_BRIDGE__`
- default managed page scripts are deduplicated per page load so the same bootstrap script is not re-run on every command

## Build

```bash
pnpm --filter @modeldriveprotocol/chrome-extension build
```

The unpacked extension output is written to:

```bash
apps/chrome-extension/dist
```

## GitHub Actions

- `.github/workflows/chrome-extension-ci.yml`
  runs on pull requests, pushes to `main`, and manual dispatch when the extension or its shared client/protocol dependencies change. It typechecks, tests, builds, packages `dist` into a zip, and uploads the artifact.
- `.github/workflows/chrome-extension-release.yml`
  runs on tags that match `chrome-extension-v*`. It validates that the tag version matches both `apps/chrome-extension/package.json` and `src/manifest.json`, then creates or updates a GitHub release with the packaged extension zip.

Example release tag:

```bash
git tag chrome-extension-v1.0.0
git push origin chrome-extension-v1.0.0
```

## Load In Chrome

1. Open `chrome://extensions`
2. Enable Developer mode
3. Choose Load unpacked
4. Select `apps/chrome-extension/dist`

## Configure

Open the extension options page and set:

- `MDP Server URL`
- target match patterns such as `https://app.example.com/*`
- optional default tool script for main-world registration

Saving the options page requests host permissions for the configured patterns.

## Page Tool Injection

Injected page scripts can register tools like this:

```js
window.__MDP_EXTENSION_BRIDGE__.registerTool('readAppState', () => {
  return window.app.store.getState()
})
```

After injection, the extension client exposes MDP tools such as:

- `page.listInjectedTools`
- `page.callInjectedTool`
- `page.runMainWorldScript`
- `page.injectToolScript`
- `page.getInjectedState`
- `page.click`
- `page.fill`
- `page.focus`
- `page.pressKey`
- `page.scrollIntoView`
- `page.scrollTo`
- `page.waitForText`
- `page.waitForSelector`
- `page.waitForVisible`
- `page.waitForHidden`
- `page.waitForUrl`
- `page.getSnapshot`

The popup also surfaces bridge health for the active tab, including registered tool count and
managed script ids that have already executed on the current page load.

Resource readers can also fetch:

- `chrome-extension://active-tab`
- `chrome-extension://active-bridge`
- `chrome-extension://tabs`

It also exposes extension-oriented tools such as:

- `extension.getStatus`
- `extension.listTabs`
- `extension.createTab`
- `extension.closeTab`
- `extension.activateTab`
- `extension.showNotification`
