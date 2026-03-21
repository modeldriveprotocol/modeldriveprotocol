---
title: JetBrains Plugin
status: Draft
---

# JetBrains Plugin

JetBrains plugins are a strong fit for MDP when IDE-local context should stay inside the IDE process but still be reachable from an MCP host.

## Good capability shapes

Typical examples include:

- reading PSI-derived context as resources
- exposing editor actions as tools
- wrapping inspections or project workflows as skills

## Integration model

The important design boundary is the same as elsewhere in MDP:

- the plugin owns capabilities
- the MDP server owns registration and routing
- the MCP host talks only to the bridge surface

## Current repo status

This repository does not yet ship a dedicated JetBrains plugin package. Treat this page as the recommended integration direction rather than a packaged starter.

Today, the closest reference implementations are:

- `apps/vscode-extension` for IDE-local runtime patterns
- `apps/chrome-extension` for browser-local runtime patterns

If you are prototyping first in JavaScript or another local runtime, the SDK and protocol pages are the right references:

- [JavaScript Usage](/sdk/javascript/usage)
- [Server Tools](/server/tools/)
- [Protocol Reference](/server/protocol)
