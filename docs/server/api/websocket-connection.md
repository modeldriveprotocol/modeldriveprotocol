---
title: WebSocket
status: Draft
---

# WebSocket Connection

Use the websocket transport when the client can keep a long-lived bidirectional connection open.

## Endpoint

- `ws://127.0.0.1:47372`
- with TLS enabled: `wss://127.0.0.1:47372`

## Message model

The websocket endpoint accepts JSON-encoded MDP messages.

## Event types

The websocket transport uses the `type` field as the event discriminator.

| Event type         | Direction        | Category   | Purpose                                         |
| ------------------ | ---------------- | ---------- | ----------------------------------------------- |
| `registerClient`   | Client -> Server | Lifecycle  | Register one client and its capability metadata |
| `updateClientCatalog` | Client -> Server | Lifecycle  | Replace one registered path catalog             |
| `unregisterClient` | Client -> Server | Lifecycle  | Remove one registered client                    |
| `callClient`       | Server -> Client | Invocation | Deliver routed capability work to the client    |
| `callClientResult` | Client -> Server | Invocation | Return the result of a routed invocation        |
| `ping`             | Both directions  | Heartbeat  | Keep the session alive                          |
| `pong`             | Both directions  | Heartbeat  | Acknowledge a heartbeat                         |

## By direction

Client-to-server events:

- [registerClient](/server/api/register-client)
- [updateClientCatalog](/server/api/update-client-capabilities)
- [unregisterClient](/server/api/unregister-client)
- [callClientResult](/server/api/call-client-result)
- [ping](/server/api/ping)
- [pong](/server/api/pong)

Server-to-client events:

- [callClient](/server/api/call-client)
- [ping](/server/api/ping)
- [pong](/server/api/pong)

## Event flow

The normal websocket sequence is:

1. open the websocket
2. send `registerClient`
3. optionally send `updateClientCatalog` whenever the local path catalog changes
4. receive `callClient` when the server routes work
5. send `callClientResult`
6. exchange `ping` and `pong` while the session stays alive
7. optionally send `unregisterClient` before disconnecting

## Sequence diagram

```mermaid
sequenceDiagram
  participant Client as MDP Client
  participant Server as MDP Server
  participant Host as MCP Host

  Client->>Server: Open WebSocket
  Client->>Server: registerClient
  Server-->>Client: Registration stays active on this socket

  opt Path catalog changes later
    Client->>Server: updateClientCatalog
    Server-->>Client: Path index is refreshed in place
  end

  Host->>Server: call one routed path on this client
  Server->>Client: callClient
  Client->>Server: callClientResult
  Server-->>Host: Return invocation result

  loop While the session stays alive
    Server->>Client: ping
    Client->>Server: pong
  end

  opt Graceful shutdown
    Client->>Server: unregisterClient
    Client-xServer: Close WebSocket
  end
```

## What each event is for

- `registerClient`: announces client identity and the current path catalog.
- `updateClientCatalog`: replaces the already-registered path catalog without changing the client identity.
- `unregisterClient`: removes one logical client registration without requiring the whole transport to disappear first.
- `callClient`: carries one routed invocation with `requestId`, target client, `method`, `path`, and optional params/query/body/headers/auth.
- `callClientResult`: closes the routed invocation by returning either `data` or `error`.
- `ping`: asks the other side to prove the connection is still alive.
- `pong`: confirms a received `ping`.

## Use it when

- the runtime can hold a stable socket
- you want lower-latency push in both directions
- you do not want to implement long-poll session management
