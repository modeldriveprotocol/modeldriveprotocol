---
title: Chrome 插件开发指南
status: Draft
---

# Chrome 插件开发指南

当你开发 `apps/chrome-extension` 里的应用时，使用这页。

## 这个模块负责什么

Chrome 插件应用负责：

- background service worker 生命周期
- Chrome 能力注册
- content script 和 main-world bridge 行为
- popup 和 options UI

## 构建与校验

先跑 app 级命令：

```bash
pnpm --filter @modeldriveprotocol/chrome-extension typecheck
pnpm --filter @modeldriveprotocol/chrome-extension test
pnpm --filter @modeldriveprotocol/chrome-extension build
```

unpacked extension 产物位于：

```text
apps/chrome-extension/dist
```

## 本地启动回路

这个 app 目前没有单独的 watch script。常见回路是：

1. 运行 `pnpm --filter @modeldriveprotocol/chrome-extension build`
2. 打开 `chrome://extensions`
3. 开启开发者模式
4. 选择 Load unpacked
5. 选择 `apps/chrome-extension/dist`

后续代码改动后，需要重新构建并在 Chrome 里 reload 这个 unpacked extension。

## 连接本地 server

在 options 页面里设置 `MDP Server URL`，通常使用：

```text
ws://127.0.0.1:47372
```

同时配置需要注入的目标 match patterns。

## 调试方式

把 `chrome://extensions` 当作主调试入口：

- reload unpacked extension
- 调试 background 生命周期或连接问题时，inspect service worker
- 调试 content script 或 DOM 自动化行为时，inspect 当前页面

如果改动同时涉及共享 packages，重跑更宽的构建链路再验证：

```bash
pnpm build
```
