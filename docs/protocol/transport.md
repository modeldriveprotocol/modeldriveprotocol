---
title: Transport
status: MVP
---

# Transport

The protocol stays transport-agnostic. The current reference implementation ships two MDP-side transports:

- `ws` / `wss` for direct bidirectional sessions
- `http` / `https` loop mode for runtimes that prefer request/response polling

Both transports preserve the same message model:

- `registerClient`
- `unregisterClient`
- `callClient`
- `callClientResult`
- `ping`
- `pong`

That means registry, routing, and MCP bridge logic stay unchanged when the transport changes.
