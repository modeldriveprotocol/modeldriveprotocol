---
title: Tools
status: MVP
---

# Tools

The server exposes a fixed MCP bridge surface. It does not generate one MCP tool per registered capability.

## Discovery tools

Use these tools to inspect the live registry:

- `listClients`
- `listTools`
- `listPrompts`
- `listSkills`
- `listResources`

## Invocation tools

Use these tools to route work to connected clients:

- `callClients`
- `callTools`
- `getPrompt`
- `callSkills`
- `readResource`

## Why the surface stays fixed

This keeps host integration stable while clients connect, disconnect, and re-register at runtime.

- hosts integrate with one predictable MCP surface
- clients remain the source of truth for capability metadata
- the server only indexes descriptors and forwards invocations

## Auth forwarding

Invocation-oriented bridge tools accept an optional `auth` object. The server forwards that payload to the target client as `callClient.auth`.

For the exact bridge semantics, see [MCP Bridge](/protocol/mcp-bridge).
