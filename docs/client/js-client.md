---
title: JS Client
status: MVP
---

# JS Client

The JavaScript client is a convenience adapter, not the protocol itself.

It is useful for:

- browser embedding
- Node-based local agents
- quick prototyping

The JS client should expose the same abstraction as other runtimes: register capability handlers, connect, handle routed calls, and report results.

## Build Outputs

The client package now emits:

- ESM SDK files under `packages/client/dist/*.js`
- a browser global bundle at `packages/client/dist/mdp-client.global.js`

The global bundle attaches `MDP` to `window`, so a plain browser page can use:

```html
<script src="/assets/mdp-client.global.js"></script>
<script>
  const client = MDP.createMdpClient({
    serverUrl: "ws://127.0.0.1:7070",
    client: {
      id: "browser-01",
      name: "Browser Client"
    }
  });
</script>
```

## ESM Usage

```ts
import { createMdpClient } from "@mdp/client";

const client = createMdpClient({
  serverUrl: "ws://127.0.0.1:7070",
  client: {
    id: "browser-01",
    name: "Browser Client"
  }
});

client.exposeTool("searchDom", async ({ query }) => {
  return { query, matches: 3 };
});

await client.connect();
client.register();
```

## Browser Global Usage

```html
<script src="/assets/mdp-client.global.js"></script>
<script>
  const client = MDP.createMdpClient({
    serverUrl: "ws://127.0.0.1:7070",
    client: {
      id: "browser-01",
      name: "Browser Client"
    }
  });

  client.exposeTool("searchDom", async ({ query }) => ({
    query,
    matches: document.body.innerText.includes(query) ? 1 : 0
  }));

  await client.connect();
  client.register();
</script>
```
