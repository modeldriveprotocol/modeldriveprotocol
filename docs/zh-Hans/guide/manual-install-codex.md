---
title: Codex 手动安装
status: MVP
---

# Codex 手动安装

如果你不想依赖 `mdp setup`，而是希望显式地在 Codex 里配置 MDP，可以直接看这一页。

## 配置文件方式

把下面这段内容加到 `~/.codex/config.toml`：

```toml
[mcp_servers.mdp]
command = "npx"
args = ["-y", "@modeldriveprotocol/server"]
```

保存后可以这样确认：

```bash
codex mcp list
```

## CLI 方式

如果你更希望直接用 Codex CLI 写入配置，也可以运行：

```bash
codex mcp add mdp -- npx -y @modeldriveprotocol/server
```

## 相关页面

- [快速开始](/zh-Hans/guide/quick-start)
- [CLI 参数](/zh-Hans/server/cli)
- [部署模式](/zh-Hans/server/deployment)
