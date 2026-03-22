---
title: Claude Code 手动安装
status: MVP
---

# Claude Code 手动安装

如果你不想依赖 `mdp setup`，而是希望显式地在 Claude Code 里配置 MDP，可以直接看这一页。

## 用户级配置

把 `mdp` 这个 MCP entry 加到 Claude Code 的用户级配置里：

```bash
claude mcp add --scope user mdp -- npx -y @modeldriveprotocol/server
```

添加后可以这样确认：

```bash
claude mcp list
```

## 项目级配置

如果你只希望当前项目可见，改成 project scope：

```bash
claude mcp add --scope project mdp -- npx -y @modeldriveprotocol/server
```

## 相关页面

- [快速开始](/zh-Hans/guide/quick-start)
- [CLI 参数](/zh-Hans/server/cli)
- [部署模式](/zh-Hans/server/deployment)
