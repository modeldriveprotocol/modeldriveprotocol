---
title: Chrome Extension Guide
status: Draft
---

# Chrome Extension Guide

Use this guide when you are developing the app under `apps/chrome-extension`.

## What this module owns

The Chrome extension app owns:

- background service worker lifecycle
- Chrome capability registration
- content-script and main-world bridge behavior
- popup and options UI

## Build and validate

Use the app-scoped commands first:

```bash
pnpm --filter @modeldriveprotocol/chrome-extension typecheck
pnpm --filter @modeldriveprotocol/chrome-extension test
pnpm --filter @modeldriveprotocol/chrome-extension build
```

The unpacked extension output is written to:

```text
apps/chrome-extension/dist/chrome-mv3
```

## Start the local loop

Choose the loop that fits what you are trying to debug:

- `dev`: let WXT launch a dedicated Chrome
- `dev:manual`: keep using your own Chrome while WXT watches and rebuilds
- `build`: produce the production-style unpacked output once
- `paths`: print the exact local directories used by the manual-dev and build flows

Use WXT dev mode during local iteration:

```bash
pnpm --filter @modeldriveprotocol/chrome-extension dev
```

If you want WXT to build/watch without auto-opening a browser, use:

```bash
pnpm --filter @modeldriveprotocol/chrome-extension dev:manual
```

The root workspace also includes:

- `.vscode/tasks.json` task `mdp:chrome-extension dev`
- `.vscode/tasks.json` task `mdp:chrome-extension dev (manual load)`
- `.vscode/tasks.json` task `mdp:chrome-extension paths`
- `.vscode/launch.json` entry `MDP Chrome Extension (WXT Dev)`
- `.vscode/launch.json` entry `MDP Chrome Extension (Manual Load)`

The checked-in WXT config keeps a persistent Chromium profile under
`apps/chrome-extension/.wxt/chrome-data` so login state and browser-side
debug settings survive restarts.

If you need machine-local runner overrides, create
`apps/chrome-extension/web-ext.config.ts`. That file is gitignored and is the
right place to customize browser startup behavior without changing the shared
project config. A ready-to-edit example lives at
`apps/chrome-extension/web-ext.config.example.ts`.

The common loop is:

1. run `pnpm --filter @modeldriveprotocol/chrome-extension dev`
2. let WXT launch Chrome with the extension loaded
3. verify popup, options, content-script, or background behavior in that dev browser

When you need a manual unpacked build instead of the WXT runner, use `pnpm --filter @modeldriveprotocol/chrome-extension build` and load `apps/chrome-extension/dist/chrome-mv3` from `chrome://extensions`.
If you want the dev pipeline plus manual browser loading, run `pnpm --filter @modeldriveprotocol/chrome-extension dev:manual` and load `apps/chrome-extension/dist/chrome-mv3-dev` while the watcher is running.
If you need the exact absolute paths on your machine, run `pnpm --filter @modeldriveprotocol/chrome-extension paths`.

## Configure against a local server

Open the extension options page and set `MDP Server URL`, typically:

```text
ws://127.0.0.1:47372
```

Also configure any target match patterns the extension should inject into.

## Real End-To-End Verification

When a change must be proven through a real browser plus a real MCP caller, use a host-native loop instead of relying on unit tests alone.

Recommended sequence:

```bash
MDP_WXT_MANUAL=1 pnpm --filter @modeldriveprotocol/chrome-extension dev -- --port 3001
node packages/server/dist/cli.js --port 47372
```

Then launch a real Chrome session against the persistent WXT profile with DevTools Protocol enabled, for example on this machine:

```bash
/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary \
  --user-data-dir=/Users/bytedance/projects/mdp/apps/chrome-extension/.wxt/chrome-data \
  --remote-debugging-port=9227 \
  --enable-unsafe-extension-debugging \
  --unsafely-disable-devtools-self-xss-warnings \
  about:blank
```

Use the extension options page to point `MDP Server URL` at:

```text
ws://127.0.0.1:47372
```

Drive the scenario through a real MCP consumer such as a Node script using `@ai-sdk/mcp`, `StdioClientTransport`, `listClients`, and `callPath`.

Important runtime rule:

- mutating workspace-management calls can trigger an extension runtime refresh
- during that window, `mdp-chrome-workspace` can briefly disappear from `listClients`
- treat disconnects as retryable reconnect windows, not as final failures

For visual proof, do not trust a DevTools target or page title by itself.
Confirm that the real extension page has non-empty DOM text before taking a screenshot.
If the page is blank, inspect its HTML and make sure WXT is serving the same `localhost:<port>` referenced by the injected script tags.

After the run:

- remove temporary route clients, background clients, and route rules
- verify cleanup in `chrome.storage.local`
- stop the local server, WXT watcher, and temporary browser process
- keep screenshots only as disposable evidence under `apps/chrome-extension/.artifacts/`

## Debugging workflow

Use `chrome://extensions` as the control center:

- load `dist/chrome-mv3` when you want to test the production-style output manually
- inspect the service worker when debugging background lifecycle or connection issues
- inspect the active page when debugging content-script or DOM automation behavior

If a change spans the extension and shared packages, rebuild the broader workspace before retesting:

```bash
pnpm build
```
