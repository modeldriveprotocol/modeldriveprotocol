---
title: Advanced Usage
status: MVP
---

# JavaScript Advanced Usage

## Choose an entry point

Pick the entry point that matches how much environment binding you want:

- `@modeldriveprotocol/client/pure`: no `WebSocket`, `fetch`, or `AbortController` implementation is pre-bound
- `@modeldriveprotocol/client/browser`: the built-in websocket and HTTP loop transports are pre-bound to the browser runtime
- `@modeldriveprotocol/client/node`: the built-in websocket transport is pre-bound to Node `ws`, and the HTTP loop transport is pre-bound to the runtime `fetch` / `AbortController`

Use the root `@modeldriveprotocol/client` entry only when you want the historical compatibility surface.
The browser and node entries also export pre-bound `WebSocketClientTransport` and `HttpLoopClientTransport`, so manual transport wiring keeps the same environment default.
The pure entry never falls back to global `WebSocket`, `fetch`, or `AbortController`, even if those globals exist.

## Transport layering

Use the JavaScript SDK transport layers like this:

- `transport`: replace the transport entirely
- `defaultTransport`: keep automatic transport selection from `serverUrl`, but customize how the built-in transport is created
- `defaultTransport.webSocket`: customize only the websocket implementation used by the built-in websocket transport
- `defaultTransport.fetch`: customize the `fetch` and `AbortController` implementations used by the built-in HTTP loop transport and cookie auth bootstrap

If your websocket implementation emits binary frames as `ArrayBuffer` or typed arrays, you can also pass `defaultTransport.webSocket.binaryMessageDecoder`.

## Inject a custom websocket class in Node

If your Node runtime should not rely on `globalThis.WebSocket`, pass a compatible class through `defaultTransport.webSocket.webSocketClass`.

```ts
import NodeWebSocket from 'ws'
import { createMdpClient } from '@modeldriveprotocol/client/pure'

const client = createMdpClient({
  serverUrl: 'ws://127.0.0.1:47372',
  defaultTransport: {
    webSocket: {
      webSocketClass: NodeWebSocket
    }
  },
  client: {
    id: 'node-01',
    name: 'Node Client'
  }
})
```

The injected class only affects the built-in websocket transport path. If you pass `transport`, the SDK will use that transport as-is.
If you use `@modeldriveprotocol/client/pure`, this does not bind `fetch` for you.

## Inject a custom websocket factory

If your websocket implementation needs extra constructor arguments or wrapping logic, inject a factory instead of a class.

```ts
import NodeWebSocket from 'ws'
import { createMdpClient } from '@modeldriveprotocol/client/pure'

const client = createMdpClient({
  serverUrl: 'ws://127.0.0.1:47372',
  defaultTransport: {
    webSocket: {
      webSocketFactory: (url) => new NodeWebSocket(url, {
        headers: {
          'x-mdp-client': 'node-01'
        }
      })
    }
  },
  client: {
    id: 'node-01',
    name: 'Node Client'
  }
})
```

## Inject fetch for HTTP loop or cookie auth

When you use `@modeldriveprotocol/client/pure` with an `http:` or `https:` server URL, inject both `fetch` and `AbortController`.

```ts
import { createMdpClient } from '@modeldriveprotocol/client/pure'

const client = createMdpClient({
  serverUrl: 'http://127.0.0.1:47372',
  defaultTransport: {
    fetch: {
      fetch: globalThis.fetch,
      abortControllerFactory: () => new AbortController()
    }
  },
  client: {
    id: 'http-01',
    name: 'HTTP Client'
  }
})
```

The same `defaultTransport.fetch` binding is also used when websocket cookie auth needs to bootstrap through `/mdp/auth`.

## Use the pre-bound Node entry

If the default Node bindings are exactly what you want, import from the Node entry and skip the extra config.

```ts
import { createMdpClient } from '@modeldriveprotocol/client/node'

const client = createMdpClient({
  serverUrl: 'ws://127.0.0.1:47372',
  client: {
    id: 'node-01',
    name: 'Node Client'
  }
})
```

## Use the pre-bound browser entry

If you are shipping module code into a browser runtime, the browser entry pre-binds both built-in transports to browser globals.

```ts
import { createMdpClient } from '@modeldriveprotocol/client/browser'

const client = createMdpClient({
  serverUrl: 'wss://127.0.0.1:47372',
  client: {
    id: 'browser-01',
    name: 'Browser Client'
  }
})
```

## Browser CDN bundle

If you want to use the browser bundle without a build step, load the CDN script and use the global `MDP` object.

```html
<script src="https://cdn.jsdelivr.net/npm/@modeldriveprotocol/client@latest/dist/modeldriveprotocol-client.global.js"></script>
<script>
  const client = MDP.createMdpClient({
    serverUrl: 'ws://127.0.0.1:47372',
    client: {
      id: 'browser-01',
      name: 'Browser Client'
    }
  })

  client.expose('/page/inspect', { method: 'GET' }, async () => ({
    title: document.title,
    url: window.location.href
  }))

  void (async () => {
    await client.connect()
    client.register()
  })()
</script>
```

The browser CDN bundle uses the same browser-bound default transport behavior as `@modeldriveprotocol/client/browser`, so browser consumers usually do not need extra transport configuration.
