---
title: MDP Server 开发指南
status: Draft
---

# MDP Server 开发指南

当你开发 `packages/server` 里的运行时时，使用这页。

## 这个模块负责什么

`packages/server` 负责：

- client session 生命周期
- 内存 registry 和 capability 索引
- 调用路由
- MCP bridge 组装
- websocket 和 HTTP loop transport 服务

## 构建与测试

先从 package 级命令开始：

```bash
pnpm --filter @modeldriveprotocol/server build
pnpm --filter @modeldriveprotocol/server test
```

如果改动还影响 protocol 或 client 集成，再扩大到：

```bash
pnpm build
pnpm test
```

## 本地启动 server

本地开发时，先构建，再运行生成出来的 CLI：

```bash
pnpm --filter @modeldriveprotocol/server build
node packages/server/dist/cli.js --port 7070
```

启动后，server 会在 stderr 打印 websocket、HTTP loop 和 auth endpoint。

默认本地 websocket 地址是：

```text
ws://127.0.0.1:7070
```

## 调试开发回路

这个 package 目前没有内置 `dev` 或 `watch` script。常见本地回路是：

1. 重新构建 `@modeldriveprotocol/server`
2. 重启 `node packages/server/dist/cli.js --port 7070`
3. 让正在测试的 client 重新连接

排查注册或路由问题时，优先保留 server 终端输出作为第一现场。

## 常见联动模块

- `packages/protocol`
  当消息结构或 guards 需要先改
- `packages/client`
  当问题只能通过某种 transport client 复现
- `scripts/smoke-test.mjs`
  当你需要端到端证明而不是只看单测
