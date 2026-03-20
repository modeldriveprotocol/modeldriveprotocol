---
title: Tools
status: MVP
---

# Tools

server 对上暴露的是一组固定的 MCP bridge tools，不会为每个已注册 capability 动态生成一套 MCP tools。

## 发现类 tools

这些 tools 用来查看当前在线 registry：

- `listClients`
- `listTools`
- `listPrompts`
- `listSkills`
- `listResources`

## 调用类 tools

这些 tools 用来把请求路由到在线 client：

- `callClients`
- `callTools`
- `getPrompt`
- `callSkills`
- `readResource`

## 为什么保持固定 surface

这样做的目的，是让 host 侧接入保持稳定，而把动态变化留在 client registry 内部。

- host 只需要适配一套稳定的 MCP surface
- capability 元数据的真源仍然在 client
- server 只做索引和转发，不持有业务能力

## 鉴权信息下发

调用型 bridge tools 支持可选 `auth` 对象。server 会把它原样下发给目标 client，体现在 `callClient.auth` 中。

更细的 bridge 语义可参考 [MCP Bridge](/zh-Hans/protocol/mcp-bridge)。
