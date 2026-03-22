---
title: Message Schema
status: MVP
---

# Message Schema

The MDP transport should support a small message set:

- `registerClient`
- `updateClientCapabilities`
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

`registerClient` publishes one full client descriptor. After registration, the same session may send `updateClientCapabilities` to replace one or more capability groups in place.

`updateClientCapabilities` should include:

- `clientId`
- `capabilities`
- one or more of `tools`, `prompts`, `skills`, `resources`

Omitted capability groups remain unchanged. Included groups replace the previous array for that category.

`registerClient` may also include an optional `auth` envelope when the client wants to attach message-level credentials to its registration.

Transport auth is out-of-band. The reference server can also record auth from request headers, cookies, or from a `/mdp/auth` cookie bootstrap that runs before a `ws` / `wss` connection is opened.

Server discovery is also out-of-band. The reference transport server exposes `GET /mdp/meta` so another process can determine whether a port is serving MDP before opening a client transport. That probe is not an MDP message and does not change the wire message set above.

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

```json
{
  "type": "updateClientCapabilities",
  "clientId": "browser-01",
  "capabilities": {
    "tools": [
      {
        "name": "searchDom"
      },
      {
        "name": "inspectSelection"
      }
    ],
    "resources": []
  }
}
```

`listClients` reflects the active connection mode without exposing secrets. A listed client includes:

- `connection.mode`: `ws` or `http-loop`
- `connection.secure`: `true` for `wss` / `https`
- `connection.authSource`: `none`, `transport`, `message`, or `transport+message`

When a server is proxying local clients into an upstream hub, the upstream server still sees normal client descriptors and normal `callClient` / `callClientResult` traffic. The proxying behavior is an implementation detail of the intermediate server, not a separate protocol message family.
