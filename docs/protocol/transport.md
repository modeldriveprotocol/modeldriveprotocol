---
title: Transport
status: MVP
---

# Transport

The protocol should stay transport-agnostic, but the MVP uses WebSocket.

That gives the first working version:

- bidirectional messaging
- request correlation
- heartbeat support
- easy native and browser embedding

Later transports can be added without rewriting the registry or router logic.

