---
title: 概览
status: MVP
---

# 服务端概览

server 被刻意设计成轻量层。

它的职责包括：

- 管理 client sessions
- 维护内存 registry
- 可选地把 clients、路由表和服务状态写成节点本地文件系统快照，便于诊断
- 按类型与名称索引 capabilities
- 暴露 MCP bridge tools
- 把调用路由到 client 并回收结果
- 可选地把本地接入的 clients 镜像到一个上游 MDP server

server 不应该关心 client 是用 Swift、Kotlin、C++、JavaScript 还是 Python 实现的。

即使运行在 upstream proxy 模式下，server 也不是 capability owner。它只是接收注册、镜像 descriptor，并转发调用。

关于启动拓扑和 cluster-mode 参数，继续阅读 [部署模式](/zh-Hans/server/deployment)。
关于可选的文件系统状态目录和文件契约，继续阅读 [状态目录](/zh-Hans/server/state-store)。
