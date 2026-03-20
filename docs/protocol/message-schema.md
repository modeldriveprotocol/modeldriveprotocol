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
- optional `auth`

`registerClient` may also include an optional `auth` envelope when the client wants to attach message-level credentials to its registration.

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
  },
  "auth": {
    "token": "host-session-token",
    "metadata": {
      "requestId": "trace-01"
    }
  }
}
```

`listClients` reflects the active connection mode without exposing secrets. A listed client includes:

- `connection.mode`: `ws` or `http-loop`
- `connection.secure`: `true` for `wss` / `https`
- `connection.authSource`: `none`, `transport`, `message`, or `transport+message`
