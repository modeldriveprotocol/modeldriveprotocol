---
title: JavaScript SDK 开发指南
status: Draft
---

# JavaScript SDK 开发指南

当你开发 `packages/client` 时，使用这页。

## 这个模块负责什么

`packages/client` 负责：

- MDP client 注册与调用处理
- websocket 和 HTTP loop client transport
- procedure registry 行为
- 浏览器入口和全局 bundle 产物

## 构建与测试

先从 package 级命令开始：

```bash
pnpm --filter @modeldriveprotocol/client build
pnpm --filter @modeldriveprotocol/client test
```

这个 build 同时包含 TypeScript 产物和 `scripts/bundle.mjs` 触发的浏览器 bundle 步骤。

## 常见开发回路

常见回路是：

1. 修改 `src/**`
2. 运行 `pnpm --filter @modeldriveprotocol/client test`
3. 运行 `pnpm --filter @modeldriveprotocol/client build`
4. 如果改动影响浏览器侧行为，再去验证下游 app

## 调试预期

这个 package 常见的两种调试方式是：

- 在 package 级测试里验证 transport、registry 和 invocation 行为
- 通过 Chrome 插件、VSCode 插件、文档站或 smoke test 做下游联调

如果问题只在集成态出现，再扩大到：

```bash
pnpm build
pnpm test
```

## 常见联动模块

- `packages/protocol`
  当消息结构或 guards 需要先改
- `apps/chrome-extension`
  当浏览器 bundle 或 transport 行为影响插件
- `apps/vscode-extension`
  当 extension-host 嵌入路径暴露问题
