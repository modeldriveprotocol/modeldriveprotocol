---
title: 简易上手
status: MVP
---

# JavaScript 简易上手

如果你想从浏览器、本地 agent 或 Node 进程里最快接入 MDP，JavaScript SDK 是最短路径。

## 1. 创建 client

```ts
import { createMdpClient } from '@modeldriveprotocol/client/browser'

const client = createMdpClient({
  serverUrl: 'ws://127.0.0.1:47372',
  client: {
    id: 'browser-01',
    name: 'Browser Client'
  }
})
```

## 2. 暴露一个 path

```ts
client.expose(
  '/page/search',
  {
    method: 'POST',
    description: 'Search the visible page text'
  },
  async ({ body }) => {
    const query = typeof body === 'object' && body !== null && !Array.isArray(body)
      ? String((body as { query?: unknown }).query ?? '')
      : ''

    return {
      query,
      matches: document.body.innerText.includes(query) ? 1 : 0
    }
  }
)
```

## 3. 建连并注册

```ts
await client.connect()
client.register()
```

## 4. 通过 server 调用

client 注册完成后，MCP host 就可以通过这些 bridge tools 访问它：

- `listClients`
- `listPaths`
- `callPath`
- `callPaths`

这四个 bridge tools 就是现在的完整 surface。

如果运行时后续变更了能力目录，先改本地 registry，再把当前 path catalog 推给 server：

```ts
client.expose('/page/inspect', { method: 'GET' }, async () => ({
  text: window.getSelection()?.toString() ?? ''
}))
client.syncCatalog()
```

如果你需要看 transport、认证引导或浏览器全局 bundle，用下一页 [如何使用](/zh-Hans/sdk/javascript/usage)。
如果你不想自己从零接 SDK，而是想直接用现成集成，优先看 [Chrome 插件](/zh-Hans/apps/chrome-extension) 或 [VSCode 插件](/zh-Hans/apps/vscode-extension)。
