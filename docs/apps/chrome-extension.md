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
2. expose tools, prompts, skills, or resources with the JavaScript SDK
3. connect to the MDP server over `ws` / `wss` or HTTP loop

If websocket auth is required in the browser, the SDK can bootstrap `/mdp/auth` automatically during `connect()`.

## Current repo status

This repository does not yet ship a dedicated Chrome extension package. The closest starter is the browser example plus the JavaScript SDK.

- [JavaScript Quick Start](/sdk/javascript/quick-start)
- [Usage](/sdk/javascript/usage)
- [Browser Client Example](/examples/browser-client)
