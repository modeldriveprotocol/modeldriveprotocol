---
title: Quick Start
status: MVP
---

# Quick Start

The shortest end-to-end path is:

1. Start the MDP server CLI.
2. Configure your MCP tool to launch the server.
3. Start one MDP client.
4. Talk to your agent and try the registered tools.

## 1. Start the Server CLI

```bash
npx @modeldriveprotocol/server --port 7070
```

If the package is already installed, the same CLI is available as `modeldriveprotocol-server`.

In an MCP-capable tool, point the MCP server entry at the CLI:

```json
{
  "mcpServers": {
    "mdp": {
      "command": "npx",
      "args": ["-y", "@modeldriveprotocol/server", "--port", "7070"]
    }
  }
}
```

For the transport-facing client APIs exposed by the server, see [APIs](/server/api/). For TLS and secure deployment, see [Security](/server/security).

## 2. Start One Client

For the quick start, use the smallest websocket example:

```ts
import { createMdpClient } from "@modeldriveprotocol/client";

const client = createMdpClient({
  serverUrl: "ws://127.0.0.1:7070",
  client: {
    id: "browser-01",
    name: "Browser Client"
  }
});

client.exposeTool("searchDom", async ({ query }) => ({
  query,
  matches: 3
}));

await client.connect();
client.register();
```

For auth, HTTP loop mode, and browser-global usage, continue with the [JavaScript SDK docs](/sdk/javascript/usage).
If you prefer starting from a packaged runtime integration, see [Chrome Extension](/apps/chrome-extension) or [VSCode Extension](/apps/vscode-extension).

## 3. Try It in Your MCP Tool

After the MCP server is configured in your tool and the client is registered, open a chat with your agent and ask it to try the related tools.

For example, ask the agent to list available clients or call the tool you just exposed. If you want the full bridge surface, see [Tools](/server/tools/).
