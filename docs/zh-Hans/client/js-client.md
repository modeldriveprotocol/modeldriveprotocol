---
title: JavaScript 客户端
status: MVP
---

# JavaScript 客户端

这个路径被保留下来，主要是为了兼容旧链接。当前主要的 JavaScript 接入文档已经移动到 `SDKs > JavaScript`。

## 推荐入口

- [简易上手](/zh-Hans/sdk/javascript/quick-start)
- [如何使用](/zh-Hans/sdk/javascript/usage)
- [MCP 定义](/zh-Hans/sdk/javascript/mcp-definitions)
- [Skills 定义](/zh-Hans/sdk/javascript/skills-definitions)
- [Chrome 插件](/zh-Hans/apps/chrome-extension)
- [VSCode 插件](/zh-Hans/apps/vscode-extension)

## JavaScript client 是什么

JavaScript client 是一个方便使用的适配器，不是协议本身。它适合：

- 浏览器嵌入
- 基于 Node 的本地 agent
- 快速原型验证

它暴露的抽象与其他运行时保持一致：注册 capability handlers、建立连接、处理路由调用、返回结果。

## 最小示例

```ts
import { createMdpClient } from '@modeldriveprotocol/client'

const client = createMdpClient({
  serverUrl: 'ws://127.0.0.1:7070',
  client: {
    id: 'browser-01',
    name: 'Browser Client'
  }
})

client.exposeTool('searchDom', async ({ query }) => ({
  query,
  matches: 3
}))

await client.connect()
client.register()
```

更完整的 transport、认证引导、浏览器全局 bundle 与能力定义细节，请继续阅读上面列出的 SDK 页面。
