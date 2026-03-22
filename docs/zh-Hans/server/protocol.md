---
title: 协议标准
status: Draft
---

# 协议标准

站在 server 视角，MDP 其实就是一组很小的生命周期与路由消息。

## 核心链路

主流程如下：

1. client 通过 `ws` / `wss` 或 `http` / `https` loop 建连
2. client 发送 `registerClient` 并带上 capability 元数据
3. server 把这些元数据索引到内存 registry
4. MCP host 调用某个 bridge tool
5. server 将请求路由成 `callClient`
6. client 返回 `callClientResult`

在一个可选的分层部署里，edge server 也可以把自己本地接入的 clients 镜像到一个上游 hub。这个过程不会改变 client 侧消息集合。edge server 仍然接收普通的 `registerClient` 和 `callClientResult`，再向上游发出普通的注册和调用。

## server 真正关心的内容

从运行时实现上，server 主要只关心这些协议元素：

- client descriptor
- tools、prompts、skills、resources 的 descriptor
- 可选带 `auth` 的调用 envelope
- 用于保活的 heartbeat 消息

在 transport 控制平面上，还多了一个 `/mdp/meta` HTTP 元数据探针。它帮助一个 server 判断另一条本地端口上是否已经存在 MDP 服务，以及自己应该向上 proxy，还是作为根 hub 独立运行。

## 继续深入

更细的协议页仍然是完整来源：

- [概览](/zh-Hans/protocol/overview)
- [能力模型](/zh-Hans/protocol/capability-model)
- [渐进式披露](/zh-Hans/protocol/progressive-disclosure)
- [传输](/zh-Hans/protocol/transport)
- [生命周期](/zh-Hans/protocol/lifecycle)
- [消息模型](/zh-Hans/protocol/message-schema)
