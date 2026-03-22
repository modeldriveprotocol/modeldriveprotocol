---
title: Browser Simple MDP Client
status: MVP
---

# Browser Simple MDP Client

`@modeldriveprotocol/browser-simple-mdp-client` is the smallest packaged browser runtime in this repository.

Use it when you want one prebuilt browser client that can connect from a plain HTML page without writing custom client code first.

## Fastest start

Load these two scripts on a page:

```html
<script src="https://cdn.jsdelivr.net/npm/@modeldriveprotocol/client@latest/dist/modeldriveprotocol-client.global.js"></script>
<script
  src="https://cdn.jsdelivr.net/npm/@modeldriveprotocol/browser-simple-mdp-client@latest/dist/browser-simple-mdp-client.global.js"
  attr-mdp-server-url="ws://127.0.0.1:47372"
  attr-mdp-client-id="browser-simple-01"
  attr-mdp-client-name="Browser Simple Client"
  attr-mdp-client-description="Minimal browser MDP client"
></script>
```

The first script loads the browser SDK global. The second script boots the packaged client and auto-registers its capabilities.

## What it can do

- read the current document title, URL, path, hash, and query parameters
- click one element by CSS selector
- show one `alert()` message in the current page
- expose skill docs so the host can discover how to use the tools

## When to use it

This package is the right starting point when:

- you want the shortest browser demo path
- you want a CDN-delivered browser client instead of custom build setup
- you only need a minimal page-inspection and interaction surface

If you want custom tools, prompts, resources, or auth and transport control, continue with [JavaScript Usage](/sdk/javascript/usage).
If you want a concrete hosted example, see [Browser Client](/examples/browser-client).
If you want a browser extension runtime instead of a page-local script, see [Chrome Extension](/apps/chrome-extension).
