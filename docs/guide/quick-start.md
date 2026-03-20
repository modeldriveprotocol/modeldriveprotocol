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

For a browser-first path, load the generated bundle:

```html
<script src="/packages/client/dist/mdp-client.global.js"></script>
```

Then create and register a client:

```html
<script>
  const client = MDP.createMdpClient({
    serverUrl: "ws://127.0.0.1:7070",
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

For the MVP, use WebSocket transport and an in-memory registry. That keeps the implementation simple while still proving the protocol shape.
