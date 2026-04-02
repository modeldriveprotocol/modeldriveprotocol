---
title: Quick Start
status: MVP
---

# JavaScript Quick Start

The JavaScript SDK is the fastest way to expose MDP capabilities from a browser, local agent, or Node process.

## 1. Create a client

```ts
import { createMdpClient } from '@modeldriveprotocol/client'

const client = createMdpClient({
  serverUrl: 'ws://127.0.0.1:47372',
  client: {
    id: 'browser-01',
    name: 'Browser Client'
  }
})
```

## 2. Expose one path

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

## 3. Connect and register

```ts
await client.connect()
client.register()
```

## 4. Call it through the server

Once the client is registered, an MCP host can use bridge tools such as:

- `listClients`
- `listPaths`
- `callPath`
- `callPaths`

Legacy aliases such as `listTools` and `callTools` still exist for migration, but the canonical bridge surface is path-based.

If the runtime changes its catalog later, update the local registry and push the current path catalog:

```ts
client.expose('/page/inspect', { method: 'GET' }, async () => ({
  text: window.getSelection()?.toString() ?? ''
}))
client.syncCatalog()
```

If you want transport choices, auth bootstrap, or browser-global usage, continue with [Usage](/sdk/javascript/usage).
If you want ready-made app integrations instead of wiring the SDK yourself, start with [Chrome Extension](/apps/chrome-extension) or [VSCode Extension](/apps/vscode-extension).
