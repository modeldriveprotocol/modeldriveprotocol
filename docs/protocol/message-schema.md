---
title: Message Schema
status: MVP
---

# Message Schema

The MDP transport should support a small message set:

- `registerClient`
- `unregisterClient`
- `callClient`
- `callClientResult`
- `ping`
- `pong`

`callClient` should include:

- `requestId`
- `clientId`
- `kind`
- `name` or `uri`
- `args`

The result should include:

- `ok`
- `data`
- `error`

```json
{
  "type": "callClient",
  "requestId": "req-123",
  "clientId": "browser-01",
  "kind": "tool",
  "name": "searchDom",
  "args": {
    "query": "MCP"
  }
}
```

