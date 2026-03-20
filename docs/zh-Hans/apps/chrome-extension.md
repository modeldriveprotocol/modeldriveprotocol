---
title: Chrome 插件
status: Draft
---

# Chrome 插件

当真正有价值的能力存在于浏览器内部，而不是远程服务里时，Chrome 插件是 MDP 很合适的一类运行时。

## 适合暴露的能力

常见场景包括：

- 读取当前标签页元数据
- 检查 DOM 状态或选区
- 触发插件自有动作
- 把浏览器本地资源暴露给 MCP host

## 推荐接入方式

最简单的做法是：

1. 在扩展页面、service worker 或受控浏览器上下文里运行 MDP client
2. 用 JavaScript SDK 暴露 tools、prompts、skills、resources
3. 通过 `ws` / `wss` 或 HTTP loop 连到 MDP server

如果浏览器 websocket 需要认证，SDK 可以在 `connect()` 时自动引导 `/mdp/auth`。

## 当前仓库状态

当前仓库还没有单独提供 Chrome 插件 package。最接近的起点，是浏览器示例加 JavaScript SDK。

- [JavaScript / 简易上手](/zh-Hans/sdk/javascript/quick-start)
- [JavaScript / 如何使用](/zh-Hans/sdk/javascript/usage)
- [浏览器客户端示例](/zh-Hans/examples/browser-client)
