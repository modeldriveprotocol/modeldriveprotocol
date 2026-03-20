---
title: protocol
status: Draft
---

# protocol

站在 server 视角，MDP 其实就是一组很小的生命周期与路由消息。

## 核心链路

主流程如下：

1. client 通过 `ws` / `wss` 或 `http` / `https` loop 建连
2. client 发送 `registerClient` 并带上 capability 元数据
3. server 把这些元数据索引到内存 registry
4. MCP host 调用某个 bridge tool
5. server 将请求路由成 `callClient`
6. client 返回 `callClientResult`

## server 真正关心的内容

从运行时实现上，server 主要只关心这些协议元素：

- client descriptor
- tools、prompts、skills、resources 的 descriptor
- 可选带 `auth` 的调用 envelope
- 用于保活的 heartbeat 消息

## 继续深入

更细的协议页仍然是完整来源：

- [概览](/zh-Hans/protocol/overview)
- [能力模型](/zh-Hans/protocol/capability-model)
- [传输](/zh-Hans/protocol/transport)
- [生命周期](/zh-Hans/protocol/lifecycle)
- [消息模型](/zh-Hans/protocol/message-schema)
