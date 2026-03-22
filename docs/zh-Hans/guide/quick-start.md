---
title: 快速开始
status: MVP
---

# 快速开始

## 1. 快速配置

```bash
npx mdp setup
```

如果你的环境里还没有可直接调用的 `mdp` 二进制执行文件，也可以直接运行包入口：

```bash
npx @modeldriveprotocol/server setup
```

默认情况下，`setup` 会尽量帮你配置几个常见的 MCP host：

- Claude Code：通过 `claude mcp add`
- Codex：写入 `~/.codex/config.toml`
- Cursor：写入 `~/.cursor/mcp.json`

常见变体：

```bash
npx mdp setup --claude
npx mdp setup --cursor --scope project
npx mdp setup --dry-run
```

如果你不想使用 `setup`，而是希望显式地只配置某一个 host，直接看对应的手动安装文档：

- [Claude Code 手动安装](/zh-Hans/guide/manual-install-claude-code)
- [Codex 手动安装](/zh-Hans/guide/manual-install-codex)
- [Cursor 手动安装](/zh-Hans/guide/manual-install-cursor)

server 实际暴露的 client transport 接口可以继续阅读 [对外接口](/zh-Hans/server/api/)。如果要启用 TLS 和安全端点，继续阅读 [安全](/zh-Hans/server/security)。
如果你想集中了解 standalone、auto 和 proxy-required 这几种拓扑，继续阅读 [部署模式](/zh-Hans/server/deployment)。

## 2. 启动一个 Client

快速开始里先用最小的 websocket 例子即可：

```ts
import { createMdpClient } from '@modeldriveprotocol/client'

const client = createMdpClient({
  serverUrl: 'ws://127.0.0.1:47372',
  client: {
    id: 'browser-01',
    name: 'Browser Client'
  }
})

client.exposeTool('searchDom', async ({ query }) => ({
  query,
  matches: 3
}))

await client.connect()
client.register()
```

如果你要看 auth、HTTP loop、浏览器全局 bundle 等接入方式，继续阅读[生态 > SDKs > JavaScript](/zh-Hans/sdk/javascript/usage)。
如果你更希望直接从现成运行时集成起步，也可以直接看 [Chrome 插件](/zh-Hans/apps/chrome-extension) 或 [VSCode 插件](/zh-Hans/apps/vscode-extension)。

## 3. 在 Agent 里试试看

当 Agent / IDE 里的 MCP 配置生效、client 也注册完成后，直接和 Agent 对话，试着调用相关工具看看。

例如，可以让 Agent 先列出可用 client，或者直接调用你刚刚暴露的那个 tool。完整的 bridge surface 可继续阅读 [工具集](/zh-Hans/server/tools/)。
