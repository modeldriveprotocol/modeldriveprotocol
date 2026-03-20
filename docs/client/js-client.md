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

Transport selection is scheme-based by default:

- `ws://` or `wss://` uses the WebSocket transport
- `http://` or `https://` uses HTTP loop mode

## Build Outputs

The client package now emits:

- ESM SDK files under `packages/client/dist/*.js`
- a browser global bundle at `packages/client/dist/modeldriveprotocol-client.global.js`

For browser globals, use the npm CDN form:

`https://cdn.jsdelivr.net/npm/@modeldriveprotocol/client@latest/dist/modeldriveprotocol-client.global.js`

The global bundle attaches `MDP` to `window`, so a plain browser page can use:

```html
<script src="https://cdn.jsdelivr.net/npm/@modeldriveprotocol/client@latest/dist/modeldriveprotocol-client.global.js"></script>
<script>
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
</script>
```

## ESM Usage

### WebSocket

```ts
import { createMdpClient } from "@modeldriveprotocol/client";

const client = createMdpClient({
  serverUrl: "ws://127.0.0.1:7070",
  client: {
    id: "browser-01",
    name: "Browser Client"
  }
});

client.exposeTool("searchDom", async ({ query }, context) => {
  return {
    query,
    matches: 3,
    authToken: context.auth?.token
  };
});

await client.connect();
client.register();
```

### HTTP Loop

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

await client.connect();
client.register();
```

## Browser Global Usage

### WebSocket

```html
<script src="https://cdn.jsdelivr.net/npm/@modeldriveprotocol/client@latest/dist/modeldriveprotocol-client.global.js"></script>
<script>
  void (async () => {
    const readPageInfo = () => ({
      title: document.title,
      url: window.location.href
    });

    const client = MDP.createMdpClient({
      serverUrl: "wss://127.0.0.1:7070",
      client: {
        id: "browser-01",
        name: document.title || "Browser Client"
      }
    });

    client.exposeTool("getPageInfo", async (_args, context) => ({
      ...readPageInfo(),
      authToken: context.auth?.token
    }));

    client.exposeTool("searchDom", async ({ query }, context) => ({
      query,
      matches: document.body.innerText.includes(query) ? 1 : 0,
      title: document.title,
      url: window.location.href,
      authToken: context.auth?.token
    }));

    await client.connect();
    client.register();
  })();
</script>
```

### HTTP Loop

```html
<script src="https://cdn.jsdelivr.net/npm/@modeldriveprotocol/client@latest/dist/modeldriveprotocol-client.global.js"></script>
<script>
  void (async () => {
    const readPageInfo = () => ({
      title: document.title,
      url: window.location.href
    });

    const client = MDP.createMdpClient({
      serverUrl: "https://127.0.0.1:7070",
      auth: {
        token: "client-session-token"
      },
      client: {
        id: "browser-01",
        name: document.title || "Browser Client"
      }
    });

    client.exposeTool("getPageInfo", async (_args, context) => ({
      ...readPageInfo(),
      authToken: context.auth?.token
    }));

    await client.connect();
    client.register();
  })();
</script>
```

If you need to rotate registration credentials after construction, call `client.setAuth(...)` before the next `register()`.
