---
title: APIs
status: Draft
---

# APIs

服务端 API 应该保持收敛，即使运行时连接的 client 和 capability 会动态变化。

## Runtime API

运行时主要负责：

- 注册和注销 client
- 列出在线 client 与 capability 索引
- 把 `callClient` 路由到正确的会话
- 执行注册与调用阶段的鉴权钩子

## Transport API

参考实现默认暴露三类入口：

- `ws://127.0.0.1:7070`
- `http://127.0.0.1:7070/mdp/http-loop`
- `http://127.0.0.1:7070/mdp/auth`

这些 transport 细节可以变化，但不应该改变 client 如何描述 capability。

## MCP API

对 MCP host 来说，server 暴露的是一组固定的 bridge tools，而不是为每个 client 动态生成一套 tools。

可继续阅读 [Tools](/zh-Hans/server/tools) 和 [protocol](/zh-Hans/server/protocol)。
