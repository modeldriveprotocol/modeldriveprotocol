---
title: Quick Start
status: MVP
---

# Quick Start

## 1. Quick Setup

```bash
npx mdp setup
```

If you do not already have the `mdp` binary available in your environment, run the package entry directly instead:

```bash
npx @modeldriveprotocol/server setup
```

By default, `setup` tries to configure the common MCP-capable hosts:

- Claude Code via `claude mcp add`
- Codex via `~/.codex/config.toml`
- Cursor via `~/.cursor/mcp.json`

Useful variants:

```bash
npx mdp setup --claude
npx mdp setup --cursor --scope project
npx mdp setup --dry-run
```

If you want to configure one host explicitly instead of using `setup`, use the host-specific manual install guides:

- [Manual Install for Claude Code](/guide/manual-install-claude-code)
- [Manual Install for Codex](/guide/manual-install-codex)
- [Manual Install for Cursor](/guide/manual-install-cursor)

For the transport-facing client APIs exposed by the server, see [APIs](/server/api/). For TLS and secure deployment, see [Security](/server/security).
For a focused explanation of standalone, auto, and proxy-required topologies, see [Deployment Modes](/server/deployment).

## 2. Start One Client

For the quick start, use the smallest websocket example:

```ts
import { createMdpClient } from '@modeldriveprotocol/client'

const client = createMdpClient({
  serverUrl: 'ws://127.0.0.1:47372',
  client: {
    id: 'browser-01',
    name: 'Browser Client'
  }
})

client.exposeTool('searchDom', async ({ query }) => ({
  query,
  matches: 3
}))

await client.connect()
client.register()
```

For auth, HTTP loop mode, and browser-global usage, continue with the [JavaScript SDK docs](/sdk/javascript/usage).
If you prefer starting from a packaged runtime integration, see [Chrome Extension](/apps/chrome-extension) or [VSCode Extension](/apps/vscode-extension).

## 3. Try It in Your Agent

After the MCP server is configured in your agent or IDE and the client is registered, open a chat and ask the agent to try the related tools.

For example, ask the agent to list available clients or call the tool you just exposed. If you want the full bridge surface, see [Tools](/server/tools/).
