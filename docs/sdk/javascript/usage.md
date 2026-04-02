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

## Client methods

The main SDK methods are:

- `expose`
- `exposeTool`
- `exposePrompt`
- `exposeSkill`
- `exposeResource`
- `unexpose`
- `useInvocationMiddleware`
- `removeInvocationMiddleware`
- `setAuth`
- `connect`
- `register`
- `describe`
- `syncCatalog`
- `disconnect`

`expose()` and `unexpose()` are the primary path-based APIs.
`exposeTool()` / `exposePrompt()` / `exposeSkill()` / `exposeResource()` remain as legacy wrappers that register compat paths plus legacy aliases.

## Updating capability catalogs

`register()` still sends the initial full descriptor. After that, update the local registry and send the current path catalog with `syncCatalog()`.

```ts
client.expose('/page/inspect', { method: 'GET' }, async () => ({
  text: window.getSelection()?.toString() ?? ''
}))
client.syncCatalog()

client.unexpose('/page/inspect', 'GET')
client.syncCatalog()
```

## Invocation middleware

Use `useInvocationMiddleware` to observe or wrap routed method+path calls in one place.

```ts
client.useInvocationMiddleware(async (invocation, next) => {
  console.log('before', invocation.method, invocation.path, invocation.legacy?.kind)

  const result = await next()

  console.log('after', invocation.requestId, result)
  return result
})
```

Middleware can inspect `invocation.type`, `invocation.method`, `invocation.path`, `invocation.params`, `invocation.queries`, `invocation.body`, `invocation.headers`, and `invocation.auth`. For legacy-wrapped entries it also exposes compatibility fields such as `invocation.legacy`, `invocation.kind`, `invocation.name`, `invocation.uri`, and `invocation.args`. Middleware can short-circuit by returning without calling `next()`.

For capability metadata details, continue with [MCP Definitions](/sdk/javascript/mcp-definitions) and [Skills Definitions](/sdk/javascript/skills-definitions).
