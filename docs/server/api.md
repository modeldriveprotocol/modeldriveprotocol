---
title: APIs
status: Draft
---

# APIs

The server has three practical surfaces:

- the MCP bridge tools documented on [Tools](/server/tools)
- the MDP transport API used by clients
- the auth bootstrap endpoint used mainly by browser websocket clients

This page focuses on the transport and message formats.

## Surface summary

| Surface | Audience | Main entry points | Data shape |
| --- | --- | --- | --- |
| MCP bridge | MCP hosts and agents | Bridge tools such as `listClients` and `callTools` | MCP tool input plus JSON `structuredContent` output |
| WebSocket transport | MDP clients | `ws://127.0.0.1:7070` | JSON-encoded MDP messages |
| HTTP loop transport | MDP clients | `/mdp/http-loop/connect`, `/send`, `/poll`, `/disconnect` | HTTP JSON request-response |
| Auth bootstrap | Browser websocket clients | `/mdp/auth` | HTTP request plus auth cookie issuance |

## Shared JSON types

### `AuthContext`

Auth-bearing APIs use this shape:

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

All fields are optional. Empty objects are treated as no auth.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `scheme` | `string` | No | Auth scheme such as `Bearer`. |
| `token` | `string` | No | Token or credential value. |
| `headers` | `Record<string, string>` | No | Auth-related headers captured or forwarded by the server. |
| `metadata` | `Record<string, unknown>` | No | Arbitrary structured auth context. |

### `SerializedError`

Invocation failures use this shape:

```json
{
  "code": "handler_error",
  "message": "Something failed",
  "details": {
    "reason": "optional"
  }
}
```

Supported error codes are:

- `bad_request`
- `not_found`
- `timeout`
- `transport_error`
- `handler_error`
- `not_ready`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `code` | `string` | Yes | Protocol error code. |
| `message` | `string` | Yes | Human-readable error message. |
| `details` | `unknown` | No | Optional structured error payload. |

### Capability kinds

Capability `kind` is one of:

- `tool`
- `prompt`
- `skill`
- `resource`

## Transport endpoint summary

| Method | Path | Used by | Purpose | Success response |
| --- | --- | --- | --- | --- |
| `WS` | `/` | WebSocket clients | Open a bidirectional MDP session | WebSocket upgrade |
| `POST` | `/mdp/http-loop/connect` | HTTP loop clients | Create a loop session | `200` with `sessionId` |
| `POST` | `/mdp/http-loop/send` | HTTP loop clients | Send one client-to-server MDP message | `202` with `{ "ok": true }` |
| `GET` | `/mdp/http-loop/poll` | HTTP loop clients | Receive one server-to-client MDP message | `200` with `message` or `204` |
| `POST` | `/mdp/http-loop/disconnect` | HTTP loop clients | Close the loop session | `204` |
| `POST` | `/mdp/auth` | Browser websocket clients | Issue auth cookie | `204` plus `Set-Cookie` |
| `DELETE` | `/mdp/auth` | Browser websocket clients | Clear auth cookie | `204` plus `Set-Cookie` |

## Transport endpoints

The reference transport server exposes:

- websocket at `ws://127.0.0.1:7070`
- HTTP loop at `http://127.0.0.1:7070/mdp/http-loop`
- auth bootstrap at `http://127.0.0.1:7070/mdp/auth`

With TLS enabled, those become `wss://` and `https://`.

## WebSocket API

The websocket endpoint accepts JSON-encoded MDP messages.

### Message catalog

| Message type | Direction | Purpose |
| --- | --- | --- |
| `registerClient` | Client -> Server | Register capability metadata. |
| `unregisterClient` | Client -> Server | Remove a registered client session. |
| `callClientResult` | Client -> Server | Return the result of a routed invocation. |
| `callClient` | Server -> Client | Invoke a capability on a connected client. |
| `ping` | Both directions | Heartbeat keepalive. |
| `pong` | Both directions | Heartbeat acknowledgement. |

### Client-to-server messages

Clients may send:

- `registerClient`
- `unregisterClient`
- `callClientResult`
- `ping`
- `pong`

### Server-to-client messages

The server may send:

- `callClient`
- `ping`
- `pong`

### `registerClient`

```json
{
  "type": "registerClient",
  "client": {
    "id": "browser-01",
    "name": "Browser Client",
    "tools": [
      {
        "name": "searchDom",
        "description": "Search the page"
      }
    ],
    "prompts": [],
    "skills": [],
    "resources": []
  },
  "auth": {
    "token": "message-token"
  }
}
```

`client` is a `ClientDescriptor` with these top-level fields:

- `id`
- `name`
- optional `description`
- optional `version`
- optional `platform`
- optional `metadata`
- `tools`
- `prompts`
- `skills`
- `resources`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | `"registerClient"` | Yes | Message discriminator. |
| `client` | `ClientDescriptor` | Yes | Client metadata and capability descriptors. |
| `auth` | `AuthContext` | No | Message-level registration auth. |

`client` fields:

| `client` field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Yes | Stable client ID. |
| `name` | `string` | Yes | Human-readable client name. |
| `description` | `string` | No | Optional client description. |
| `version` | `string` | No | Optional client version. |
| `platform` | `string` | No | Optional runtime platform label. |
| `metadata` | `Record<string, unknown>` | No | Client-defined metadata. |
| `tools` | `ToolDescriptor[]` | Yes | Registered tool descriptors. |
| `prompts` | `PromptDescriptor[]` | Yes | Registered prompt descriptors. |
| `skills` | `SkillDescriptor[]` | Yes | Registered skill descriptors. Static Markdown skills typically advertise `contentType: "text/markdown"`. |
| `resources` | `ResourceDescriptor[]` | Yes | Registered resource descriptors. |

### `callClient`

The server routes invocation work to a client with:

```json
{
  "type": "callClient",
  "requestId": "req-01",
  "clientId": "browser-01",
  "kind": "tool",
  "name": "searchDom",
  "args": {
    "query": "mdp"
  },
  "auth": {
    "token": "host-token"
  }
}
```

Rules:

- use `name` for `tool`, `prompt`, and `skill`
- use `uri` for `resource`
- `args` is optional
- `auth` is optional

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | `"callClient"` | Yes | Message discriminator. |
| `requestId` | `string` | Yes | Request correlation ID. |
| `clientId` | `string` | Yes | Target client ID. |
| `kind` | `"tool" \| "prompt" \| "skill" \| "resource"` | Yes | Capability kind to invoke. |
| `name` | `string` | Conditional | Required for `tool`, `prompt`, and `skill`. |
| `uri` | `string` | Conditional | Required for `resource`. |
| `args` | `Record<string, unknown>` | No | Arguments passed to the client handler. |
| `auth` | `AuthContext` | No | Invocation auth forwarded to the client. |

### `callClientResult`

Success:

```json
{
  "type": "callClientResult",
  "requestId": "req-01",
  "ok": true,
  "data": {
    "matches": 3
  }
}
```

Failure:

```json
{
  "type": "callClientResult",
  "requestId": "req-01",
  "ok": false,
  "error": {
    "code": "handler_error",
    "message": "DOM not ready"
  }
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | `"callClientResult"` | Yes | Message discriminator. |
| `requestId` | `string` | Yes | Correlates this result to the original `callClient`. |
| `ok` | `boolean` | Yes | Whether the invocation succeeded. |
| `data` | `unknown` | No | Present when `ok` is `true`. |
| `error` | `SerializedError` | No | Present when `ok` is `false`. |

### Heartbeats

Heartbeat messages use:

```json
{
  "type": "ping",
  "timestamp": 1760000000000
}
```

and:

```json
{
  "type": "pong",
  "timestamp": 1760000000000
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | `"ping"` or `"pong"` | Yes | Heartbeat message discriminator. |
| `timestamp` | `number` | Yes | Millisecond timestamp echoed between peers. |

## HTTP loop API

HTTP loop is the request-response transport alternative to websocket sessions.

### Session identification

After connect, the client must provide the session ID on later requests in either:

- the `x-mdp-session-id` header
- the `sessionId` query parameter

| Location | Type | Required | Description |
| --- | --- | --- | --- |
| `x-mdp-session-id` header | `string` | No | Preferred session identifier header after connect. |
| `sessionId` query parameter | `string` | No | Query-string fallback for the same session ID. |

### `POST /mdp/http-loop/connect`

Request body:

```json
{}
```

Response:

```json
{
  "sessionId": "6c8a3b2b-7f2b-4be5-a2d8-1f0c8c4f8b54"
}
```

The server accepts an empty JSON object here. Transport auth can be supplied through headers.

| Request field | Type | Required | Description |
| --- | --- | --- | --- |
| None | - | - | The endpoint accepts an empty JSON object. |

| Response field | Type | Description |
| --- | --- | --- |
| `sessionId` | `string` | New HTTP loop session ID for subsequent `/send`, `/poll`, and `/disconnect` calls. |

### `POST /mdp/http-loop/send`

Request body:

```json
{
  "message": {
    "type": "registerClient",
    "client": {
      "id": "browser-01",
      "name": "Browser Client",
      "tools": [],
      "prompts": [],
      "skills": [],
      "resources": []
    }
  }
}
```

Response:

```json
{
  "ok": true
}
```

Only client-to-server MDP messages are accepted here.

| Request field | Type | Required | Description |
| --- | --- | --- | --- |
| `message` | `ClientToServerMessage` | Yes | One client-to-server MDP message, excluding `callClient`. |

| Response field | Type | Description |
| --- | --- | --- |
| `ok` | `true` | Indicates the message was accepted for processing. |

### `GET /mdp/http-loop/poll`

Query parameters:

- `sessionId`
- optional `waitMs`

If a message is available, response is:

```json
{
  "message": {
    "type": "callClient",
    "requestId": "req-01",
    "clientId": "browser-01",
    "kind": "tool",
    "name": "searchDom",
    "args": {
      "query": "mdp"
    }
  }
}
```

If no message becomes available before timeout, the server returns `204 No Content`.

`waitMs` is clamped to a maximum of `60000`. If omitted or invalid, the server uses its configured long-poll timeout.

| Query field | Type | Required | Description |
| --- | --- | --- | --- |
| `sessionId` | `string` | Yes | Session to poll from. |
| `waitMs` | `number` | No | Desired long-poll wait time, clamped to `60000`. |

| Response field | Type | Description |
| --- | --- | --- |
| `message` | `ServerToClientMessage` | Present on `200`, containing one queued server message. |

### `POST /mdp/http-loop/disconnect`

Request body:

```json
{}
```

Response: `204 No Content`

| Request field | Type | Required | Description |
| --- | --- | --- | --- |
| None | - | - | The endpoint accepts an empty JSON object. Session ID comes from header or query parameter. |

### Complete HTTP loop sequence

From the client's point of view, the normal sequence is:

1. connect and get a `sessionId`
2. send `registerClient`
3. poll until the server pushes `callClient`
4. send `callClientResult`
5. disconnect when done

Minimal `curl` flow:

```bash
curl -X POST http://127.0.0.1:7070/mdp/http-loop/connect \
  -H 'content-type: application/json' \
  -d '{}'
```

Example response:

```json
{
  "sessionId": "SESSION_ID"
}
```

Register the client:

```bash
curl -X POST 'http://127.0.0.1:7070/mdp/http-loop/send?sessionId=SESSION_ID' \
  -H 'content-type: application/json' \
  -d '{
    "message": {
      "type": "registerClient",
      "client": {
        "id": "browser-01",
        "name": "Browser Client",
        "tools": [{ "name": "searchDom" }],
        "prompts": [],
        "skills": [],
        "resources": []
      }
    }
  }'
```

Poll for work:

```bash
curl 'http://127.0.0.1:7070/mdp/http-loop/poll?sessionId=SESSION_ID&waitMs=25000'
```

If the server has work, you receive a `callClient` payload. After executing the local handler, return:

```bash
curl -X POST 'http://127.0.0.1:7070/mdp/http-loop/send?sessionId=SESSION_ID' \
  -H 'content-type: application/json' \
  -d '{
    "message": {
      "type": "callClientResult",
      "requestId": "req-01",
      "ok": true,
      "data": {
        "matches": 3
      }
    }
  }'
```

Finally disconnect:

```bash
curl -X POST 'http://127.0.0.1:7070/mdp/http-loop/disconnect?sessionId=SESSION_ID' \
  -H 'content-type: application/json' \
  -d '{}'
```

## Auth bootstrap API

Browser websocket clients can bootstrap cookie-based auth through `/mdp/auth`.

### `POST /mdp/auth`

Request body:

```json
{
  "auth": {
    "token": "client-session-token"
  }
}
```

Response:

- status `204 No Content`
- `Set-Cookie` header carrying the serialized auth context

If the request body omits `auth`, the server falls back to transport auth extracted from request headers.

| Request field | Type | Required | Description |
| --- | --- | --- | --- |
| `auth` | `AuthContext` | No | Auth context to serialize into the cookie. If omitted, the server falls back to transport headers. |

| Response element | Type | Description |
| --- | --- | --- |
| `Set-Cookie` | `string` | Serialized auth cookie used by later websocket or HTTP requests. |

Typical browser bootstrap flow:

1. `POST /mdp/auth` with an `auth` body
2. receive `Set-Cookie`
3. open the websocket connection on the same origin

After that, the cookie contributes to transport auth for the websocket session.

### `DELETE /mdp/auth`

Response:

- status `204 No Content`
- `Set-Cookie` header clearing the auth cookie

| Response element | Type | Description |
| --- | --- | --- |
| `Set-Cookie` | `string` | Cookie clearing directive for the configured auth cookie name. |

## Transport auth extraction

By default, the server extracts transport auth from:

- `Authorization`
- `Cookie`
- headers prefixed with `x-mdp-auth-`

For websocket and HTTP loop sessions, that auth contributes to `connection.authSource`.

## CORS behavior

The HTTP loop and auth endpoints send CORS headers. When an `Origin` header is present, the server:

- reflects that origin
- allows credentials
- allows `content-type`, `x-mdp-session-id`, configured auth headers, and requested headers

## Relationship to the MCP bridge

The transport API is for MDP clients. MCP hosts do not call these endpoints directly. MCP hosts talk to the bridge tools described in [Tools](/server/tools).
