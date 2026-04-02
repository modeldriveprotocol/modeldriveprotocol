---
title: 概览
status: Draft
---

# 协议概览

MDP 同时是一个发现协议和一个 RPC bridge 协议。

client 提供能力，server 负责存储和索引，MCP host 则通过固定的 bridge surface 消费这些能力。

协议线框本身保持传输无关，当前实现已经提供：

- `ws` / `wss` 会话
- `http` / `https loop` 会话
- 注册后可通过 `updateClientCatalog` 生命周期消息原地替换已注册的路径目录
- `registerClient` 和 `callClient` 上的可选 auth envelope
- 通过请求头或 `/mdp/auth` cookie bootstrap 注入 transport auth
- 通过 `GET /mdp/meta` 做 MDP server 的带外探测

当前 server 实现也可以运行在一个分层拓扑里：

- 一个 standalone hub，持有 MCP bridge
- 一个接收本地 client 会话的 edge server
- edge 到 hub 的可选 upstream proxy

这种发现和 proxy 行为属于 transport 控制平面能力，不会新增 MDP wire message。

MDP 当前定义的是 path-based 目录模型：

- 显式 `method + path` 的 `endpoint`
- 位于 `*.prompt.md` 的 `prompt`
- 位于 `*.skill.md` 的 `skill`

其中 `skills` 特别适合做渐进式披露：client 可以把它们注册成 `/topic/skill.md`、`/topic/detail/skill.md` 这类分层 Markdown 文档。
