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

## Ready-made app references

If you want a packaged runtime integration instead of wiring the SDK from scratch, start with:

- [Chrome Extension](/apps/chrome-extension)
- [VSCode Extension](/apps/vscode-extension)

## Transport selection

The default transport is selected from `serverUrl`:

- `ws://` and `wss://` use the websocket transport
- `http://` and `https://` use HTTP loop mode

## Auth bootstrap

For browser websocket auth, passing `auth` is enough. `connect()` will bootstrap `/mdp/auth` on the matching `http` or `https` origin before opening the socket.

```ts
const client = createMdpClient({
  serverUrl: 'wss://127.0.0.1:47372',
  auth: {
    token: 'client-session-token'
  },
  client: {
    id: 'browser-01',
    name: 'Browser Client'
  }
})

await client.connect()
client.register()
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
- `removeTool`
- `removePrompt`
- `removeSkill`
- `removeResource`
- `setAuth`
- `connect`
- `register`
- `syncTools`
- `syncPrompts`
- `syncSkills`
- `syncResources`
- `syncCapabilities`
- `disconnect`

## Updating capability catalogs

`register()` still sends the initial full descriptor. After that, change the local registry and send only the capability groups that changed.

```ts
client.exposeTool('inspectSelection', async () => ({
  text: window.getSelection()?.toString() ?? ''
}))
client.syncTools()

client.removeResource('webpage://active-tab/page-info')
client.syncResources()
```

For capability metadata details, continue with [MCP Definitions](/sdk/javascript/mcp-definitions) and [Skills Definitions](/sdk/javascript/skills-definitions).
