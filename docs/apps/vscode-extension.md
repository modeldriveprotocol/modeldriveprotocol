---
title: VSCode Extension
status: Draft
---

# VSCode Extension

VSCode is a good MDP host runtime when the capability depends on workspace state, editor selection, diagnostics, or extension-owned commands.

## Good capability shapes

Typical examples include:

- reading the active file or selection as a resource
- exposing extension commands as tools
- packaging review or refactor flows as skills

## Recommended topology

Run the MDP client inside the extension host process and expose capabilities from the extension boundary, not from a separate remote service.

That keeps:

- editor state local
- capability metadata explicit
- MCP integration stable through the MDP server

## Current repo status

This repository does not yet ship a dedicated VSCode extension package. Today the practical path is to integrate the JavaScript SDK into your extension entry point.

- [JavaScript Quick Start](/sdk/javascript/quick-start)
- [MCP Definitions](/sdk/javascript/mcp-definitions)
- [Skills Definitions](/sdk/javascript/skills-definitions)
