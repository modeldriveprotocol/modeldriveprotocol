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
apps/chrome-extension/dist
```

## Start the local loop

There is no dedicated watch script for this app right now. The common loop is:

1. run `pnpm --filter @modeldriveprotocol/chrome-extension build`
2. open `chrome://extensions`
3. enable Developer mode
4. choose Load unpacked
5. select `apps/chrome-extension/dist`

After code changes, rebuild and reload the unpacked extension in Chrome.

## Configure against a local server

Open the extension options page and set `MDP Server URL`, typically:

```text
ws://127.0.0.1:7070
```

Also configure any target match patterns the extension should inject into.

## Debugging workflow

Use `chrome://extensions` as the control center:

- reload the unpacked extension after each rebuild
- inspect the service worker when debugging background lifecycle or connection issues
- inspect the active page when debugging content-script or DOM automation behavior

If a change spans the extension and shared packages, rebuild the broader workspace before retesting:

```bash
pnpm build
```
