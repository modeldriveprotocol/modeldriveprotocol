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

如果你的改动会影响共享的 CLI 帮助文本或生成型文档块，再额外执行：

```bash
pnpm docs:sync
pnpm docs:sync:check
```

`docs:sync` 会基于 `packages/server/dist/cli-reference.js` 重写 CLI 参数页里的生成块。`docs:sync:check` 是不落盘的校验模式，适合 CI 或合并前检查。如果后面还要新增别的生成型文档页，把它登记到 `scripts/generated-docs.config.mjs`。

## 本地启动 server

本地开发时，先构建，再运行生成出来的 CLI：

```bash
pnpm --filter @modeldriveprotocol/server build
node packages/server/dist/cli.js --port 47372
```

启动后，server 会在 stderr 打印 websocket、HTTP loop 和 auth endpoint。
同时也会打印 `/mdp/meta` 这个元数据探针地址。

默认本地 websocket 地址是：

```text
ws://127.0.0.1:47372
```

## 本地分层拓扑

如果你需要在本地调试多 server 行为，建议显式起一个 hub，再起一个 edge。

Hub：

```bash
node packages/server/dist/cli.js --port 47372 --server-id hub
```

显式指定上游的 edge：

```bash
node packages/server/dist/cli.js \
  --port 47170 \
  --cluster-mode proxy-required \
  --upstream-url ws://127.0.0.1:47372 \
  --server-id edge-01
```

依赖发现流程的 edge：

```bash
node packages/server/dist/cli.js \
  --cluster-mode auto \
  --discover-host 127.0.0.1 \
  --discover-start-port 47372 \
  --discover-attempts 100 \
  --server-id edge-02
```

在这个拓扑下，运行时本地 clients 通常应该连接 edge server，而不是直接连 hub。hub 继续承担面向 MCP 的 bridge surface。

如果要看完整的参数列表和 `--help` 输出形式，继续阅读 [CLI 参数](/zh-Hans/server/cli)。

## 调试开发回路

这个 package 目前没有内置 `dev` 或 `watch` script。常见本地回路是：

1. 重新构建 `@modeldriveprotocol/server`
2. 重启 `node packages/server/dist/cli.js --port 47372`
3. 让正在测试的 client 重新连接

排查注册或路由问题时，优先保留 server 终端输出作为第一现场。

## 常见联动模块

- `packages/protocol`
  当消息结构或 guards 需要先改
- `packages/client`
  当问题只能通过某种 transport client 复现
- `scripts/smoke-test.mjs`
  当你需要端到端证明而不是只看单测
