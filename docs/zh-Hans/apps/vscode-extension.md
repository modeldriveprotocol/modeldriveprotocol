---
title: VSCode 插件
status: Draft
---

# VSCode 插件

如果能力依赖工作区状态、编辑器选区、诊断信息或插件自身命令，VSCode 插件会是 MDP 很自然的一类宿主运行时。

## 适合暴露的能力

常见场景包括：

- 把当前文件或选区作为 resource 暴露
- 把扩展命令暴露成 tool
- 把评审、修复、重构流程封装成 skill

## 推荐接入方式

建议把 MDP client 直接运行在 extension host 进程里，而不是再额外拆一个远程服务。

这样可以保持：

- 编辑器状态留在本地
- capability 元数据清晰可见
- MCP 集成统一经过 MDP server

## 当前仓库状态

当前仓库还没有单独提供 VSCode 插件 package。现阶段更实际的路径，是把 JavaScript SDK 集成进你的扩展入口。

- [JavaScript / 简易上手](/zh-Hans/sdk/javascript/quick-start)
- [MCP 定义](/zh-Hans/sdk/javascript/mcp-definitions)
- [Skills 定义](/zh-Hans/sdk/javascript/skills-definitions)
