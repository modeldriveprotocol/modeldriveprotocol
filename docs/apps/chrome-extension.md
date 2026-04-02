---
title: Chrome Extension
status: Draft
---

# Chrome Extension

Chrome extensions are a strong fit for MDP when the useful capability lives in the browser rather than on a remote server.

## Good capability shapes

Typical examples include:

- reading active tab metadata
- inspecting DOM state or selection
- triggering extension-owned actions
- exposing browser-local resources to an MCP host

## Recommended topology

The simplest setup is:

1. run the MDP client inside an extension page, service worker, or controlled browser context
2. expose endpoint, prompt, or skill paths with the JavaScript SDK
3. connect to the MDP server over `ws` / `wss` or HTTP loop

The SDK still keeps `exposeTool` / `exposePrompt` / `exposeSkill` / `exposeResource` as migration wrappers, but the canonical model is path-based.

If websocket auth is required in the browser, the SDK can bootstrap `/mdp/auth` automatically during `connect()`.

## Current repo status

This repository now includes a dedicated Chrome extension app under `apps/chrome-extension`.

The app is built as an MDP client:

- the background service worker connects to the MDP server
- matched pages receive a content script for DOM operations
- the extension can inject a main-world bridge so page-local code can register paths
- the local development workflow is powered by WXT

## What it exposes

The current extension app can expose capabilities such as:

- Chrome-side endpoint paths for tab management, notifications, and config status
- DOM-oriented endpoint paths through the content script
- injected main-world endpoint paths through `window.__MDP_EXTENSION_BRIDGE__`
- bridge-facing endpoint paths such as `GET /page/injected-paths`, `POST /page/call-injected-path`, and `POST /page/snapshot`

## Build and load

Build the unpacked extension with:

```bash
pnpm --filter @modeldriveprotocol/chrome-extension build
```

Then load `apps/chrome-extension/dist/chrome-mv3` from `chrome://extensions` with Developer mode enabled.

For local iteration, use:

```bash
pnpm --filter @modeldriveprotocol/chrome-extension dev
```

That uses WXT dev mode to start Chrome with the extension loaded, so you can inspect changes locally without a manual rebuild/load cycle.

## Configure

Use the extension options page to set:

- the MDP server URL
- target match patterns
- the optional default bridge script for main-world registration

- [JavaScript Quick Start](/sdk/javascript/quick-start)
- [Usage](/sdk/javascript/usage)
- [Browser Client Example](/examples/browser-client)
