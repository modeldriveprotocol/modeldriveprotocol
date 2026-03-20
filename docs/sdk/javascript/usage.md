---
title: Usage
status: MVP
---

# JavaScript Usage

The JavaScript SDK is a convenience adapter around the protocol. It lets a runtime define handlers, connect to the server, and respond to routed invocations.

## Runtime fit

It works well for:

- browser pages and extensions
- Node-based local agents
- local helper processes used for prototyping

## Transport selection

The default transport is selected from `serverUrl`:

- `ws://` and `wss://` use the websocket transport
- `http://` and `https://` use HTTP loop mode

## Auth bootstrap

For browser websocket auth, passing `auth` is enough. `connect()` will bootstrap `/mdp/auth` on the matching `http` or `https` origin before opening the socket.

```ts
const client = createMdpClient({
  serverUrl: "wss://127.0.0.1:7070",
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

## Browser global bundle

The package also ships a browser global bundle:

`https://cdn.jsdelivr.net/npm/@modeldriveprotocol/client@latest/dist/modeldriveprotocol-client.global.js`

That bundle exposes `MDP` on `window`, so a plain page can register capabilities without a build step.

## Capability methods

The main SDK methods are:

- `exposeTool`
- `exposePrompt`
- `exposeSkill`
- `exposeResource`
- `setAuth`
- `connect`
- `register`
- `disconnect`

For capability metadata details, continue with [MCP Definitions](/sdk/javascript/mcp-definitions) and [Skills Definitions](/sdk/javascript/skills-definitions).
