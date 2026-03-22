---
title: Cursor 手动安装
status: MVP
---

# Cursor 手动安装

如果你不想依赖 `mdp setup`，而是希望显式地在 Cursor 里配置 MDP，可以直接看这一页。

## 项目级配置

如果只想让当前项目可见，把下面这段内容加到 `.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "mdp": {
      "command": "npx",
      "args": ["-y", "@modeldriveprotocol/server"]
    }
  }
}
```

## 用户级配置

如果你希望所有项目都可见，把同样的配置加到 `~/.cursor/mcp.json`。

保存之后重新加载 Cursor，Agent 就可以看到这个新的 MCP server。

## 相关页面

- [快速开始](/zh-Hans/guide/quick-start)
- [CLI 参数](/zh-Hans/server/cli)
- [部署模式](/zh-Hans/server/deployment)
