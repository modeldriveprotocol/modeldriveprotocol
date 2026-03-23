---
title: Manual Install
status: MVP
---

# Manual Install

Use this page when you want to configure MDP explicitly instead of relying on `npx mdp setup`.

The examples below follow the client-specific installation patterns commonly used in MCP hosts. This page focuses on local MCP server setups, where the host launches MDP over `stdio`.

If you are working inside this repository checkout instead of consuming a published package, prefer the local launcher at `scripts/run-local-mdp-mcp.mjs`. That keeps the host pointed at your checked-out server code and matches what `mdp setup --scope project` writes automatically.

## Common Clients

::: details Claude Code
Use the Claude CLI:

```bash
claude mcp add --scope user mdp -- npx -y @modeldriveprotocol/server
```

Project scope:

```bash
claude mcp add --scope project mdp -- npx -y @modeldriveprotocol/server
```
:::

::: details OpenAI Codex
Using the Codex CLI:

```bash
codex mcp add mdp -- npx -y @modeldriveprotocol/server
```

Inside this repository, prefer project scope with the local launcher:

```toml
[mcp_servers.mdp]
command = "node"
args = ["scripts/run-local-mdp-mcp.mjs"]
startup_timeout_sec = 20
```

Or add this to `~/.codex/config.toml` or `.codex/config.toml`:

```toml
[mcp_servers.mdp]
command = "npx"
args = ["-y", "@modeldriveprotocol/server"]
startup_timeout_sec = 20
```
:::

::: details Google Antigravity
Add this to the Antigravity MCP config:

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
:::

::: details Cursor
Global config in `~/.cursor/mcp.json`:

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

For one project only, use `.cursor/mcp.json`.
:::

::: details OpenCode
Add this to your OpenCode config:

```json
{
  "mcp": {
    "mdp": {
      "type": "local",
      "command": ["npx", "-y", "@modeldriveprotocol/server"],
      "enabled": true
    }
  }
}
```
:::

::: details VS Code
Add this to `.vscode/mcp.json`:

```json
{
  "servers": {
    "mdp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modeldriveprotocol/server"]
    }
  }
}
```
:::

::: details Kiro
In `Kiro` -> `MCP Servers`, add:

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
:::

::: details JetBrains AI Assistant
Open `Settings` -> `Tools` -> `AI Assistant` -> `Model Context Protocol (MCP)` and add:

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
:::

::: details Gemini CLI
Add this to `~/.gemini/settings.json`:

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
:::

::: details Qwen Code
Using the CLI:

```bash
qwen mcp add mdp npx -y @modeldriveprotocol/server
```

Or add this to `~/.qwen/settings.json` or `.qwen/settings.json`:

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
:::

::: details Amazon Q Developer CLI
Add this to the Amazon Q Developer CLI MCP config:

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
:::

::: details Warp
In `Settings` -> `AI` -> `Manage MCP servers`, paste:

```json
{
  "MDP": {
    "command": "npx",
    "args": ["-y", "@modeldriveprotocol/server"],
    "env": {},
    "working_directory": null,
    "start_on_launch": true
  }
}
```
:::

::: details Zed
Add this to your Zed `settings.json`:

```json
{
  "context_servers": {
    "MDP": {
      "source": "custom",
      "command": "npx",
      "args": ["-y", "@modeldriveprotocol/server"]
    }
  }
}
```
:::

::: details Trae
Use the Add manually flow and paste:

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
:::

::: details Roo Code
Add this to the Roo Code MCP config:

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
:::

::: details Augment Code
In `settings.json`, add the server inside `augment.advanced.mcpServers`:

```json
{
  "augment.advanced": {
    "mcpServers": [
      {
        "name": "mdp",
        "command": "npx",
        "args": ["-y", "@modeldriveprotocol/server"]
      }
    ]
  }
}
```
:::

::: details LM Studio
Open `Program` -> `Install` -> `Edit mcp.json` and add:

```json
{
  "mcpServers": {
    "MDP": {
      "command": "npx",
      "args": ["-y", "@modeldriveprotocol/server"]
    }
  }
}
```
:::

::: details Visual Studio 2022
Add this to the MCP server config:

```json
{
  "mcp": {
    "servers": {
      "mdp": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@modeldriveprotocol/server"]
      }
    }
  }
}
```
:::

::: details Crush
Add this to your Crush config:

```json
{
  "$schema": "https://charm.land/crush.json",
  "mcp": {
    "mdp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modeldriveprotocol/server"]
    }
  }
}
```
:::

::: details BoltAI
In `Settings` -> `Plugins`, enter:

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
:::

::: details Rovo Dev CLI
Open the Rovo Dev CLI MCP config:

```bash
acli rovodev mcp
```

Then add:

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
:::

::: details Zencoder
In `Agent tools` -> `Add custom MCP`, use:

```json
{
  "command": "npx",
  "args": ["-y", "@modeldriveprotocol/server"]
}
```
:::

## Related Pages

- [Quick Start](/guide/quick-start)
- [CLI Reference](/server/cli)
- [Deployment Modes](/server/deployment)
