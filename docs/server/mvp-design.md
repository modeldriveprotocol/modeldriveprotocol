---
title: MVP Design
status: MVP
---

# MVP Design

The first usable version should be small:

- single server process
- `ws` / `wss` plus `http` / `https` loop transports
- in-memory registry
- one client can expose all four capability kinds
- stable MCP bridge tools

Non-goals for the MVP:

- distributed registry
- multi-tenant policy engine
- per-capability dynamic MCP tool generation
- complex persistence
