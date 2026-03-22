---
title: Quick Start
status: MVP
---

# Quick Start

## 1. Quick Setup

```bash
npx mdp setup
```

If you do not already have the `mdp` binary available in your environment, run the package entry directly instead:

```bash
npx @modeldriveprotocol/server setup
```

If you want common MCP hosts to be configured automatically, the `setup` command is the shortest path.

If you want to configure hosts explicitly, continue with [Manual Install](/guide/manual-install).
If you want the transport-facing client APIs exposed by the server, see [APIs](/server/api/).
If you need TLS or secure endpoint details, see [Security](/server/security).
If you want a focused explanation of standalone, auto, and proxy-required topologies, see [Deployment Modes](/server/deployment).

## 2. Start One Client

For the browser path, the fastest working client is these two CDN scripts:

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

The first script loads the browser SDK bundle. The second script loads the prebuilt `browser-simple-mdp-client` app, which auto-connects and registers a minimal browser capability set.

If you want the package-specific details, built-in capability list, and usage notes, see [Browser Simple MDP Client](/apps/browser-simple-mdp-client).

For a Pages-hosted example in this repo, see [Browser Client](/examples/browser/index.html).
For auth, HTTP loop mode, and custom browser-global usage, continue with the [JavaScript SDK docs](/sdk/javascript/usage).
If you prefer starting from a packaged runtime integration, see [Chrome Extension](/apps/chrome-extension) or [VSCode Extension](/apps/vscode-extension).

## 3. Try It in Your Agent

After the MCP server is configured in your agent or IDE and the client is registered, open a chat and ask the agent to try the related tools.

For example, ask the agent to list available clients or call the tool you just exposed. If you want the full bridge surface, see [Tools](/server/tools/).
