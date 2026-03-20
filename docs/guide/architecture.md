---
title: Architecture
status: Draft
---

# Architecture

The minimal architecture has three parts:

1. `MDP client` exposes local procedures.
2. `MDP server` stores registry state and routes calls.
3. `MCP host` talks only to the server through stable bridge tools.

```mermaid
flowchart LR
  host["MCP Host"] <--> server["MDP Server"]
  server <--> client["MDP Client"]
  client --> runtime["Local runtime: mobile, desktop, web, backend"]
```

The important boundary is that the server is thin. It should not contain application-specific logic, only registry and routing logic.

