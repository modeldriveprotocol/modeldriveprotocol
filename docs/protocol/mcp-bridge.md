---
title: MCP Bridge
status: MVP
---

# MCP Bridge

The MDP server exposes a stable MCP tool surface instead of generating tools dynamically per capability.

Bridge tools:

- `listClients`
- `callClients`
- `listTools`
- `callTools`
- `listPrompts`
- `getPrompt`
- `listSkills`
- `callSkills`
- `listResources`
- `readResource`

The bridge surface keeps the host integration stable while still allowing the client registry to change at runtime.

Invocation-oriented bridge tools such as `callClients`, `callTools`, `getPrompt`, `callSkills`, and `readResource` also accept an optional `auth` object. That payload is forwarded to the target client as `callClient.auth`.
