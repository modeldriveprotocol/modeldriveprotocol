---
title: Quick Start
status: MVP
---

# Quick Start

The shortest end-to-end path is:

1. Start the MDP server CLI.
2. Start one MDP client.
3. Register at least one capability.
4. Connect an MCP host and call the bridge tools.

## 1. Start the Server CLI

```bash
npx @modeldriveprotocol/server --port 7070
```

If the package is already installed, the same CLI is available as `modeldriveprotocol-server`.

By default the same listener exposes:

- WebSocket at `ws://127.0.0.1:7070`
- HTTP loop at `http://127.0.0.1:7070/mdp/http-loop`

To expose secure endpoints, provide a key pair:

```bash
npx @modeldriveprotocol/server --port 7070 --tls-key ./certs/server-key.pem --tls-cert ./certs/server-cert.pem
```

With TLS enabled, the endpoints become `wss://127.0.0.1:7070` and `https://127.0.0.1:7070/mdp/http-loop`.

## 2. Start One Client

Use `ws://` or `wss://` when you want a direct bidirectional session:

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

Use `http://` or `https://` when the runtime prefers request/response polling or when you want explicit HTTP-carried auth:

```ts
import { createMdpClient } from "@modeldriveprotocol/client";

const client = createMdpClient({
  serverUrl: "http://127.0.0.1:7070",
  auth: {
    token: "client-session-token"
  },
  client: {
    id: "browser-01",
    name: "Browser Client"
  }
});

client.exposeTool("searchDom", async ({ query }, context) => ({
  query,
  matches: 3,
  authToken: context.auth?.token
}));

await client.connect();
client.register();
```

If you want a browser-global example, load the bundle first and wrap the async work explicitly:

```html
<script src="https://cdn.jsdelivr.net/npm/@modeldriveprotocol/client@latest/dist/modeldriveprotocol-client.global.js"></script>
<script>
  void (async () => {
    const client = MDP.createMdpClient({
      serverUrl: "ws://127.0.0.1:7070",
      client: {
        id: "browser-01",
        name: document.title || "Browser Client"
      }
    });

    client.exposeTool("getPageInfo", async () => ({
      title: document.title,
      url: window.location.href
    }));

    await client.connect();
    client.register();
  })();
</script>
```

## 3. Connect an MCP Host

After a client registers, the MCP bridge exposes stable tools such as:

- `listClients`
- `listTools`
- `callTools`
- `getPrompt`
- `readResource`

The registry remains in-memory, but the transport can vary without changing the MCP bridge contract.
