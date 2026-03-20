---
title: 传输
status: MVP
---

# 传输

协议本身保持传输无关。当前参考实现已经提供两种 MDP 侧 transport：

- 面向直接双向会话的 `ws` / `wss`
- 面向轮询运行时的 `http` / `https loop`

两种 transport 共用同一套消息模型：

- `registerClient`
- `unregisterClient`
- `callClient`
- `callClientResult`
- `ping`
- `pong`

因此 transport 变化时，不需要改 registry、routing 或 MCP bridge 语义。
