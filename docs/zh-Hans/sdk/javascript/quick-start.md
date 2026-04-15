---
title: 简易上手
status: MVP
---

# JavaScript 简易上手

如果你的 MDP client 运行在浏览器页面、本地 agent、Node 进程或自定义 JavaScript 运行时里，优先使用 JavaScript SDK。

## 1. 安装 package

```bash
npm install @modeldriveprotocol/client
```

这个简易上手页使用浏览器绑定入口：

```ts
import { createMdpClient } from '@modeldriveprotocol/client/browser'
```

## 2. 创建 client

```ts
const client = createMdpClient({
  serverUrl: 'ws://127.0.0.1:47372',
  client: {
    id: 'browser-01',
    name: 'Browser Client'
  }
})
```

## 3. 暴露一个 path

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

## 4. 建连并注册

```ts
await client.connect()
client.register()
```

## 5. 通过 server 调用

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

## Transport 支持

JavaScript SDK 当前支持：

- `ws` / `wss`
- `http` / `https` loop mode

如果你需要看 transport、认证引导或浏览器全局 bundle，用下一页 [如何使用](/zh-Hans/sdk/javascript/usage)。
如果你不想自己从零接 SDK，而是想直接用现成集成，优先看 [Chrome 插件](/zh-Hans/apps/chrome-extension) 或 [VSCode 插件](/zh-Hans/apps/vscode-extension)。
如果你要看 contributor workflow、调试经验和 package 级验证，继续阅读 [JavaScript SDK 开发指南](/zh-Hans/contributing/modules/sdks/javascript)。
