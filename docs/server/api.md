---
title: APIs
status: Draft
---

# APIs

The server API surface should stay narrow, even when clients and capabilities change at runtime.

## Runtime API

The runtime is responsible for:

- registering and unregistering clients
- listing connected clients and indexed capabilities
- routing `callClient` requests to the correct session
- enforcing registration and invocation authorization hooks

## Transport API

The reference transport server exposes three entry points:

- WebSocket at `ws://127.0.0.1:7070`
- HTTP loop at `http://127.0.0.1:7070/mdp/http-loop`
- browser auth bootstrap at `http://127.0.0.1:7070/mdp/auth`

Those transport details can evolve without changing how clients describe capabilities.

## MCP API

On the host-facing side, the server exposes a fixed MCP bridge surface rather than generating tools dynamically per client.

See [Tools](/server/tools) for the bridge entry points and [Protocol](/server/protocol) for the wire-level model.
