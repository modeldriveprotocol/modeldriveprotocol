---
title: 高级用法
status: MVP
---

# JavaScript 高级用法

## 先选入口

先根据你想要的环境绑定程度来选入口：

- `@modeldriveprotocol/client/pure`：不预绑定任何 `WebSocket`、`fetch` 或 `AbortController` 实现
- `@modeldriveprotocol/client/browser`：把内建 websocket 和 HTTP loop transport 预绑定到浏览器运行时
- `@modeldriveprotocol/client/node`：把内建 websocket transport 预绑定到 Node 的 `ws`，同时把 HTTP loop transport 预绑定到运行时的 `fetch` / `AbortController`

只有在你需要历史兼容 surface 时，才继续使用根入口 `@modeldriveprotocol/client`。
浏览器入口和 Node 入口也都会导出预绑定的 `WebSocketClientTransport` 和 `HttpLoopClientTransport`，所以手动组装 transport 时也能保持同样的环境默认值。
`pure` 入口即使运行时里已经存在全局 `WebSocket`、`fetch` 或 `AbortController`，也不会自动回退去使用它们。

## transport 分层

JavaScript SDK 的 transport 分层建议这样理解：

- `transport`：完全替换 transport 实现
- `defaultTransport`：保留基于 `serverUrl` 的默认 transport 选择，但定制内建 transport 的创建方式
- `defaultTransport.webSocket`：只定制内建 websocket transport 使用的 websocket 实现
- `defaultTransport.fetch`：定制内建 HTTP loop transport 和 cookie 鉴权引导会使用的 `fetch` / `AbortController`

如果你的 websocket 实现会把二进制帧作为 `ArrayBuffer` 或 typed array 抛出来，也可以传 `defaultTransport.webSocket.binaryMessageDecoder`。

## 在 Node 里注入自定义 websocket class

如果你的 Node 运行时不想依赖 `globalThis.WebSocket`，可以通过 `defaultTransport.webSocket.webSocketClass` 传入一个兼容的 class。

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

这个注入只会影响内建 websocket transport 这条路径。如果你直接传了 `transport`，SDK 会原样使用该 transport。
如果你使用的是 `@modeldriveprotocol/client/pure`，这里只会绑定 websocket，不会顺带帮你绑定 `fetch`。

## 注入自定义 websocket factory

如果你的 websocket 实现需要额外构造参数，或者需要先包一层适配逻辑，可以传 `webSocketFactory`，而不是直接传 class。

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

## 为 HTTP loop 或 cookie 鉴权注入 fetch

如果你在 `@modeldriveprotocol/client/pure` 里使用 `http:` 或 `https:` 的 server URL，需要同时传入 `fetch` 和 `AbortController`。

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

同一套 `defaultTransport.fetch` 绑定在 websocket 通过 `/mdp/auth` 做 cookie 鉴权引导时也会被复用。

## 使用预绑定的 Node 入口

如果默认的 Node 绑定正好就是你想要的，可以直接从 Node 入口导入，省掉额外配置。

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

## 使用预绑定的浏览器入口

如果你是在浏览器运行时里交付模块代码，浏览器入口会把两种内建 transport 都预绑定到浏览器全局对象上。

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

## 浏览器 CDN bundle

如果你不想走构建流程，可以直接加载 CDN 脚本，然后使用全局的 `MDP` 对象。

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

浏览器 CDN bundle 使用的是和 `@modeldriveprotocol/client/browser` 相同的浏览器默认 transport 绑定，所以浏览器使用者通常不需要额外的 transport 配置。
