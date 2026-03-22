---
title: 如何使用
status: MVP
---

# 如何使用

JavaScript SDK 是协议上的一个方便适配层。它负责让运行时注册 handler、连到 server、并响应路由过来的调用。

## 适合哪些运行时

它比较适合：

- 浏览器页面和浏览器扩展
- 基于 Node 的本地 agent
- 本地辅助进程或原型验证程序

## 现成 app 参考

如果你不想从零接 SDK，而是想直接从仓库里的现成运行时集成开始，优先看：

- [Chrome 插件](/zh-Hans/apps/chrome-extension)
- [VSCode 插件](/zh-Hans/apps/vscode-extension)

## transport 选择

默认 transport 由 `serverUrl` 决定：

- `ws://` 和 `wss://` 走 websocket
- `http://` 和 `https://` 走 HTTP loop

## 浏览器认证引导

如果浏览器侧 websocket 需要认证，直接传 `auth` 即可。`connect()` 会在打开 socket 前，先对同源 `http` / `https` 地址发起 `/mdp/auth` 引导。

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

## 浏览器全局 bundle

这个包还提供浏览器全局 bundle：

`https://cdn.jsdelivr.net/npm/@modeldriveprotocol/client@latest/dist/modeldriveprotocol-client.global.js`

加载后会把 `MDP` 挂到 `window` 上，因此普通 HTML 页面也能直接注册 capability。

## 主要方法

最常用的方法包括：

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

## 更新 capability 目录

`register()` 仍然负责首次全量注册。之后如果本地 registry 发生变化，只需要把变化过的 capability 分组重新同步给 server。

```ts
client.exposeTool('inspectSelection', async () => ({
  text: window.getSelection()?.toString() ?? ''
}))
client.syncTools()

client.removeResource('webpage://active-tab/page-info')
client.syncResources()
```

如果你要看能力元数据如何定义，继续阅读 [MCP 定义](/zh-Hans/sdk/javascript/mcp-definitions) 和 [Skills 定义](/zh-Hans/sdk/javascript/skills-definitions)。
