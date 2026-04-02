---
title: MCP Bridge
status: MVP
---

# MCP Bridge

MDP server 暴露的是一组稳定的 MCP tool surface，而不是按 capability 动态生成 tools。

Bridge tools 包括：

- `listClients`
- `listPaths`
- `callPath`
- `callPaths`

这样的 bridge surface 可以让 host 侧保持稳定，同时允许 client registry 在运行时动态变化。

path-oriented bridge 是当前 canonical surface。当前 server 也保留了 legacy bridge 名称作为兼容别名：

- `listTools`、`listPrompts`、`listSkills`、`listResources`
- `callTools`、`getPrompt`、`callSkills`、`readResource`
- `callClients`

`callPath`、`callPaths` 以及这些 legacy 调用型 bridge tools 都支持可选的 `auth` 对象。这个 payload 会原样下发给目标 client，体现在 `callClient.auth` 里。
