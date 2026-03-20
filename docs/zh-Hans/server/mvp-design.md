---
title: MVP 设计
status: MVP
---

# MVP 设计

第一版可用实现应该足够小：

- 单个 server 进程
- `ws` / `wss` 与 `http` / `https loop` transports
- 内存 registry
- 一个 client 可以暴露全部四类 capability
- 稳定的 MCP bridge tools

MVP 的非目标包括：

- 分布式 registry
- 多租户策略引擎
- 为每个 capability 动态生成 MCP tools
- 复杂持久化
