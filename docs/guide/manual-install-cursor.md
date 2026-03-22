---
title: Manual Install for Cursor
status: MVP
---

# Manual Install for Cursor

Use this page when you want to configure MDP in Cursor explicitly instead of relying on `mdp setup`.

## Project Scope

For a project-local setup, add this to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "mdp": {
      "command": "npx",
      "args": ["-y", "@modeldriveprotocol/server"]
    }
  }
}
```

## User Scope

For a user-level setup across projects, add the same entry to `~/.cursor/mcp.json`.

After saving, reload Cursor so the agent picks up the new MCP server.

## Related Pages

- [Quick Start](/guide/quick-start)
- [CLI Reference](/server/cli)
- [Deployment Modes](/server/deployment)
