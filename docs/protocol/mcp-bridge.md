---
title: MCP Bridge
status: MVP
---

# MCP Bridge

The MDP server exposes a stable MCP tool surface instead of generating tools dynamically per capability.

Bridge tools:

- `listClients`
- `listPaths`
- `callPath`
- `callPaths`

The bridge surface keeps the host integration stable while still allowing the registered path catalogs to change at runtime.

The path-oriented bridge is the canonical surface. The current server also keeps the legacy bridge names available as compatibility aliases:

- `listTools`, `listPrompts`, `listSkills`, `listResources`
- `callTools`, `getPrompt`, `callSkills`, `readResource`
- `callClients`

Invocation-oriented bridge tools such as `callPath` and `callPaths` also accept an optional `auth` object. That payload is forwarded to the target client as `callClient.auth`.
