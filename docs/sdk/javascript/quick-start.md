---
title: Quick Start
status: MVP
---

# JavaScript Quick Start

Use the JavaScript SDK when your MDP client lives in a browser page, local agent, Node process, or custom JavaScript runtime.

## 1. Install the package

```bash
npm install @modeldriveprotocol/client
```

This quick start uses the browser-bound entry point:

```ts
import { createMdpClient } from '@modeldriveprotocol/client/browser'
```

## 2. Create a client

```ts
const client = createMdpClient({
  serverUrl: 'ws://127.0.0.1:47372',
  client: {
    id: 'browser-01',
    name: 'Browser Client'
  }
})
```

## 3. Expose one path

```ts
client.expose(
  '/page/search',
  {
    method: 'POST',
    description: 'Search the visible page text'
  },
  async ({ body }) => {
    const query = typeof body === 'object' && body !== null && !Array.isArray(body)
      ? String((body as { query?: unknown }).query ?? '')
      : ''

    return {
      query,
      matches: document.body.innerText.includes(query) ? 1 : 0
    }
  }
)
```

## 4. Connect and register

```ts
await client.connect()
client.register()
```

## 5. Call it through the server

Once the client is registered, an MCP host can use bridge tools such as:

- `listClients`
- `listPaths`
- `callPath`
- `callPaths`

Those four bridge tools are the surface to target.

If the runtime changes its catalog later, update the local registry and push the current path catalog:

```ts
client.expose('/page/inspect', { method: 'GET' }, async () => ({
  text: window.getSelection()?.toString() ?? ''
}))
client.syncCatalog()
```

## Transport support

The JavaScript SDK currently supports:

- `ws` / `wss`
- `http` / `https` loop mode

If you want transport choices, auth bootstrap, or browser-global usage, continue with [Usage](/sdk/javascript/usage).
If you want ready-made app integrations instead of wiring the SDK yourself, start with [Chrome Extension](/apps/chrome-extension) or [VSCode Extension](/apps/vscode-extension).
For contributor workflow, debugging notes, and package-level validation, continue with [JavaScript SDK Guide](/contributing/modules/sdks/javascript).
