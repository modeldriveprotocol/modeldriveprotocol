---
title: APIs
status: Draft
---

# APIs

The server exposes transport-facing APIs for MDP clients. This section is split into connection setup, message events, and external interfaces.

## Read by task

| Goal                                              | Start here                                                                                                     |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Open a bidirectional session                      | [WebSocket](/server/api/websocket-connection)                                                                  |
| Use request-response transport instead of sockets | [HTTP Loop](/server/api/http-loop-connection)                                                                  |
| Bootstrap browser auth before opening a websocket | [Auth Bootstrap](/server/api/auth-bootstrap)                                                                   |
| Probe whether a port is serving MDP              | [GET /mdp/meta](/server/api/meta)                                                                              |
| Update a connected client's capability catalog    | [updateClientCapabilities](/server/api/update-client-capabilities)                                             |
| Look up websocket message event types             | [registerClient](/server/api/register-client), [callClient](/server/api/call-client), [ping](/server/api/ping) |
| Check exact HTTP request and response contracts   | [POST /mdp/http-loop/connect](/server/api/http-loop-connect), [POST /mdp/auth](/server/api/auth-issue), [GET /mdp/meta](/server/api/meta) |

## Connection Setup

| Surface                                       | Entry point              | Notes                                                 |
| --------------------------------------------- | ------------------------ | ----------------------------------------------------- |
| [WebSocket](/server/api/websocket-connection) | `ws://127.0.0.1:47070`    | Bidirectional JSON MDP messages                       |
| [HTTP Loop](/server/api/http-loop-connection) | `/mdp/http-loop/connect` | Session-based long-poll transport                     |
| [Auth Bootstrap](/server/api/auth-bootstrap)  | `/mdp/auth`              | Cookie bootstrap mainly for browser websocket clients |
| [Metadata Probe](/server/api/meta)            | `/mdp/meta`              | Identify an MDP server and read discovery hints       |

## Message Events

| Event                                              | Direction        | Purpose                                   |
| -------------------------------------------------- | ---------------- | ----------------------------------------- |
| [registerClient](/server/api/register-client)      | Client -> Server | Register capability metadata              |
| [updateClientCapabilities](/server/api/update-client-capabilities) | Client -> Server | Replace one or more capability catalogs   |
| [unregisterClient](/server/api/unregister-client)  | Client -> Server | Remove one registered client session      |
| [callClient](/server/api/call-client)              | Server -> Client | Invoke a capability on a connected client |
| [callClientResult](/server/api/call-client-result) | Client -> Server | Return a routed invocation result         |
| [ping](/server/api/ping)                           | Both directions  | Heartbeat keepalive                       |
| [pong](/server/api/pong)                           | Both directions  | Heartbeat acknowledgement                 |

## External Interfaces

| Interface                                                          | Method   | Purpose                                   |
| ------------------------------------------------------------------ | -------- | ----------------------------------------- |
| [POST /mdp/http-loop/connect](/server/api/http-loop-connect)       | `POST`   | Create one HTTP loop session              |
| [POST /mdp/http-loop/send](/server/api/http-loop-send)             | `POST`   | Send one client-to-server message         |
| [GET /mdp/http-loop/poll](/server/api/http-loop-poll)              | `GET`    | Receive one server-to-client message      |
| [POST /mdp/http-loop/disconnect](/server/api/http-loop-disconnect) | `POST`   | Close one HTTP loop session               |
| [POST /mdp/auth](/server/api/auth-issue)                           | `POST`   | Issue one auth cookie                     |
| [DELETE /mdp/auth](/server/api/auth-delete)                        | `DELETE` | Clear one auth cookie                     |
| [GET /mdp/meta](/server/api/meta)                                  | `GET`    | Probe one server for MDP metadata         |
| [GET /skills/:clientId/*skillPath](/server/api/skill-route-direct) | `GET`    | Read one skill over the direct HTTP route |
| [GET /:clientId/skills/*skillPath](/server/api/skill-route-nested) | `GET`    | Read one skill over the nested HTTP route |

## Shared JSON types

`AuthContext`:

```json
{
  "scheme": "Bearer",
  "token": "client-session-token",
  "headers": {
    "x-mdp-auth-tenant": "demo"
  },
  "metadata": {
    "role": "operator"
  }
}
```

`SerializedError`:

```json
{
  "code": "handler_error",
  "message": "Something failed",
  "details": {
    "reason": "optional"
  }
}
```

Capability `kind` is one of `tool`, `prompt`, `skill`, or `resource`.

## Relationship to bridge tools

These APIs are for MDP clients. MCP hosts do not call them directly. MCP hosts use the bridge [Tools](/server/tools/).
