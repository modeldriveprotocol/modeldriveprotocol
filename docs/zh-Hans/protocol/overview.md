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
- `registerClient` 和 `callClient` 上的可选 auth envelope
- 通过请求头或 `/mdp/auth` cookie bootstrap 注入 transport auth

MDP 当前定义四类能力：

- `tools`
- `prompts`
- `skills`
- `resources`

每一类都可以描述不同类型的运行时本地能力或只读表面。
其中 `skills` 特别适合做渐进式披露：client 可以把它们注册成 `topic`、`topic/detail` 这类分层 Markdown 文档。
