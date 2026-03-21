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
  serverUrl: 'ws://127.0.0.1:7070',
  client: {
    id: 'browser-01',
    name: 'Browser Client'
  }
})
```

## 2. Expose one tool

```ts
client.exposeTool('searchDom', async ({ query }) => ({
  query,
  matches: document.body.innerText.includes(String(query ?? '')) ? 1 : 0
}))
```

## 3. Connect and register

```ts
await client.connect()
client.register()
```

## 4. Call it through the server

Once the client is registered, an MCP host can use bridge tools such as:

- `listClients`
- `listTools`
- `callTools`

If you want transport choices, auth bootstrap, or browser-global usage, continue with [Usage](/sdk/javascript/usage).
If you want ready-made app integrations instead of wiring the SDK yourself, start with [Chrome Extension](/apps/chrome-extension) or [VSCode Extension](/apps/vscode-extension).
