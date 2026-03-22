---
title: Manual Install for Claude Code
status: MVP
---

# Manual Install for Claude Code

Use this page when you want to configure MDP in Claude Code explicitly instead of relying on `mdp setup`.

## User Scope

Add the `mdp` MCP entry to your user-level Claude Code config:

```bash
claude mcp add --scope user mdp -- npx -y @modeldriveprotocol/server
```

Verify that it was added:

```bash
claude mcp list
```

## Project Scope

If you only want the current project to see this server, use project scope instead:

```bash
claude mcp add --scope project mdp -- npx -y @modeldriveprotocol/server
```

## Related Pages

- [Quick Start](/guide/quick-start)
- [CLI Reference](/server/cli)
- [Deployment Modes](/server/deployment)
