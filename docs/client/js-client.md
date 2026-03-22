---
title: JavaScript Client
status: MVP
---

# JavaScript Client

This path is kept for compatibility with older links. The primary JavaScript integration docs now live under `SDKs > JavaScript`.

## Preferred entry points

- [Quick Start](/sdk/javascript/quick-start)
- [Usage](/sdk/javascript/usage)
- [MCP Definitions](/sdk/javascript/mcp-definitions)
- [Skills Definitions](/sdk/javascript/skills-definitions)
- [Chrome Extension](/apps/chrome-extension)
- [VSCode Extension](/apps/vscode-extension)

## What the JavaScript client is

The JavaScript client is a convenience adapter, not the protocol itself. It works well for:

- browser embedding
- Node-based local agents
- quick prototyping

The client exposes the same abstraction as other runtimes: register capability handlers, connect, handle routed calls, and return results.

## Minimal example

```ts
import { createMdpClient } from '@modeldriveprotocol/client'

const client = createMdpClient({
  serverUrl: 'ws://127.0.0.1:47372',
  client: {
    id: 'browser-01',
    name: 'Browser Client'
  }
})

client.exposeTool('searchDom', async ({ query }) => ({
  query,
  matches: 3
}))

await client.connect()
client.register()
```

For transport choices, auth bootstrap, browser-global usage, and richer capability definitions, continue with the linked SDK pages above.
