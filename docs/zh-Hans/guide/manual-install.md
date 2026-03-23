---
title: 手动安装
status: MVP
---

# 手动安装

如果你不想依赖 `npx mdp setup`，而是希望显式地手动配置 MDP，可以直接看这一页。

下面这些例子参考了常见 MCP host 的安装方式，重点覆盖本地 `stdio` 模式，也就是由宿主直接拉起 MDP server。

如果你现在就在这个仓库里开发，而不是使用已经发布好的包，优先使用仓库里的本地 launcher：`scripts/run-local-mdp-mcp.mjs`。`mdp setup --scope project` 也会优先写入这条路径。

## 常见客户端

::: details Claude Code
直接使用 Claude CLI：

```bash
claude mcp add --scope user mdp -- npx -y @modeldriveprotocol/server
```

如果只想当前项目可见：

```bash
claude mcp add --scope project mdp -- npx -y @modeldriveprotocol/server
```
:::

::: details OpenAI Codex
使用 Codex CLI：

```bash
codex mcp add mdp -- npx -y @modeldriveprotocol/server
```

如果是在这个仓库里本地开发，更推荐项目级配置改成本地 launcher：

```toml
[mcp_servers.mdp]
command = "node"
args = ["scripts/run-local-mdp-mcp.mjs"]
startup_timeout_sec = 20
```

或者把下面这段内容加到 `~/.codex/config.toml` 或 `.codex/config.toml`：

```toml
[mcp_servers.mdp]
command = "npx"
args = ["-y", "@modeldriveprotocol/server"]
startup_timeout_sec = 20
```
:::

::: details Google Antigravity
把下面这段内容加到 Antigravity 的 MCP 配置里：

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
:::

::: details Cursor
全局配置写到 `~/.cursor/mcp.json`：

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

如果只想当前项目可见，改成 `.cursor/mcp.json`。
:::

::: details OpenCode
把下面这段内容加到 OpenCode 配置里：

```json
{
  "mcp": {
    "mdp": {
      "type": "local",
      "command": ["npx", "-y", "@modeldriveprotocol/server"],
      "enabled": true
    }
  }
}
```
:::

::: details VS Code
把下面这段内容加到 `.vscode/mcp.json`：

```json
{
  "servers": {
    "mdp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modeldriveprotocol/server"]
    }
  }
}
```
:::

::: details Kiro
进入 `Kiro` -> `MCP Servers`，然后添加：

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
:::

::: details JetBrains AI Assistant
进入 `Settings` -> `Tools` -> `AI Assistant` -> `Model Context Protocol (MCP)`，然后添加：

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
:::

::: details Gemini CLI
把下面这段内容加到 `~/.gemini/settings.json`：

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
:::

::: details Qwen Code
使用 CLI：

```bash
qwen mcp add mdp npx -y @modeldriveprotocol/server
```

或者把下面这段内容加到 `~/.qwen/settings.json` 或 `.qwen/settings.json`：

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
:::

::: details Amazon Q Developer CLI
把下面这段内容加到 Amazon Q Developer CLI 的 MCP 配置里：

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
:::

::: details Warp
在 `Settings` -> `AI` -> `Manage MCP servers` 中粘贴：

```json
{
  "MDP": {
    "command": "npx",
    "args": ["-y", "@modeldriveprotocol/server"],
    "env": {},
    "working_directory": null,
    "start_on_launch": true
  }
}
```
:::

::: details Zed
把下面这段内容加到 Zed 的 `settings.json`：

```json
{
  "context_servers": {
    "MDP": {
      "source": "custom",
      "command": "npx",
      "args": ["-y", "@modeldriveprotocol/server"]
    }
  }
}
```
:::

::: details Trae
使用 `Add manually`，然后粘贴：

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
:::

::: details Roo Code
把下面这段内容加到 Roo Code 的 MCP 配置里：

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
:::

::: details Augment Code
在 `settings.json` 里，把 server 加到 `augment.advanced.mcpServers`：

```json
{
  "augment.advanced": {
    "mcpServers": [
      {
        "name": "mdp",
        "command": "npx",
        "args": ["-y", "@modeldriveprotocol/server"]
      }
    ]
  }
}
```
:::

::: details LM Studio
进入 `Program` -> `Install` -> `Edit mcp.json`，然后加入：

```json
{
  "mcpServers": {
    "MDP": {
      "command": "npx",
      "args": ["-y", "@modeldriveprotocol/server"]
    }
  }
}
```
:::

::: details Visual Studio 2022
把下面这段内容加到 MCP server 配置里：

```json
{
  "mcp": {
    "servers": {
      "mdp": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@modeldriveprotocol/server"]
      }
    }
  }
}
```
:::

::: details Crush
把下面这段内容加到 Crush 配置里：

```json
{
  "$schema": "https://charm.land/crush.json",
  "mcp": {
    "mdp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modeldriveprotocol/server"]
    }
  }
}
```
:::

::: details BoltAI
在 `Settings` -> `Plugins` 中填入：

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
:::

::: details Rovo Dev CLI
先打开 Rovo Dev CLI 的 MCP 配置：

```bash
acli rovodev mcp
```

然后加入：

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
:::

::: details Zencoder
在 `Agent tools` -> `Add custom MCP` 中使用：

```json
{
  "command": "npx",
  "args": ["-y", "@modeldriveprotocol/server"]
}
```
:::

## 相关页面

- [快速开始](/zh-Hans/guide/quick-start)
- [CLI 参数](/zh-Hans/server/cli)
- [部署模式](/zh-Hans/server/deployment)
