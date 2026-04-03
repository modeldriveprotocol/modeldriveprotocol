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
2. 用 JavaScript SDK 暴露 endpoint、prompt、skill 路径
3. 通过 `ws` / `wss` 或 HTTP loop 连到 MDP server

如果浏览器 websocket 需要认证，SDK 可以在 `connect()` 时自动引导 `/mdp/auth`。

## 当前仓库状态

当前仓库已经内置一个 Chrome 插件应用，目录在 `apps/chrome-extension`。

这个 app 本身就是一个 MDP client：

- background service worker 负责连接 MDP server
- 命中的页面会注入 content script 处理 DOM 相关操作
- 插件还能注入 main-world bridge，让页面脚本自行注册路径
- 本地开发回路由 WXT 驱动

## 默认暴露的能力

当前这个 Chrome 插件 app 可以暴露这几类能力：

- 标签页管理、通知、配置状态等 Chrome 侧 endpoint path
- 通过 content script 提供的页面 DOM endpoint path
- 通过 `window.__MDP_EXTENSION_BRIDGE__` 注册的 injected endpoint path
- `GET /page/injected-paths`、`POST /page/call-injected-path`、`POST /page/snapshot` 这类桥接 endpoint

## 构建与加载

可以这样构建 unpacked extension：

```bash
pnpm --filter @modeldriveprotocol/chrome-extension build
```

构建产物位于 `apps/chrome-extension/dist/chrome-mv3`，然后在 `chrome://extensions` 打开开发者模式并选择 Load unpacked 即可。

本地迭代时，可以直接跑：

```bash
pnpm --filter @modeldriveprotocol/chrome-extension dev
```

这会通过 WXT dev mode 启动一个已加载插件的 Chrome，本地改动后可以直接在这个开发浏览器里看效果，不必每次手动重建再加载。

## 配置

在插件 options 页面里配置：

- MDP server URL
- 目标页面匹配规则
- 可选的默认 path main-world bridge 脚本

- [JavaScript / 简易上手](/zh-Hans/sdk/javascript/quick-start)
- [JavaScript / 如何使用](/zh-Hans/sdk/javascript/usage)
- [浏览器客户端示例](/zh-Hans/examples/browser-client)
