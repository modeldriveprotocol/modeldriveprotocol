---
title: Quick Start
status: MVP
---

# Quick Start

The fastest path to a working setup is:

1. Build the workspace.
2. Run the TypeScript MDP server.
3. Start one client process.
4. Register a tool, prompt, skill, and resource.
5. Connect an MCP host and call the bridge tools.

```bash
pnpm install
pnpm build
node packages/server/dist/cli.js --port 7070
```

To expose secure endpoints, provide a key pair:

```bash
node packages/server/dist/cli.js --port 7070 --tls-key ./certs/server-key.pem --tls-cert ./certs/server-cert.pem
```

For a browser-first path, load the generated bundle:

```html
<script src="/assets/modeldriveprotocol-client.global.js"></script>
```

Then create and register a client:

```html
<script>
  const client = MDP.createMdpClient({
    serverUrl: "http://127.0.0.1:7070",
    auth: {
      token: "client-session-token"
    },
    client: {
      id: "browser-01",
      name: "Browser Client"
    }
  });

  await client.connect();
  client.register();
</script>
```

The previous MVP path still works too:

1. Run the TypeScript MDP server.
2. Start one client process.
3. Register a tool, prompt, skill, and resource.
4. Connect an MCP host and call the bridge tools.

Current reference transport choices are:

- `ws://` / `wss://` for socket sessions
- `http://` / `https://` for HTTP loop mode

The quick path above uses HTTP loop because it works well in browser and request/response-first runtimes. Use `wss://` when you want a secure socket session instead.

The runtime still keeps an in-memory registry. Transport can now vary without changing the MCP bridge contract.
