---
title: 快速开始
status: MVP
---

# 快速开始

最短的端到端路径是：

1. 启动 MDP server CLI。
2. 在你的 MCP 工具里配置这个 server。
3. 启动一个 MDP client。
4. 和 Agent 对话，试着调用刚注册的工具。

## 1. 启动 Server CLI

```bash
npx @modeldriveprotocol/server --port 7070
```

如果包已经安装到环境里，也可以直接使用 `modeldriveprotocol-server` 这个 CLI 名称。

如果你的 MCP 工具使用配置文件，可以把这个 CLI 配到 `mcpServers` 里：

```json
{
  "mcpServers": {
    "mdp": {
      "command": "npx",
      "args": ["-y", "@modeldriveprotocol/server", "--port", "7070"]
    }
  }
}
```

server 实际暴露的 client transport 接口可以继续阅读 [对外接口](/zh-Hans/server/api/)。如果要启用 TLS 和安全端点，继续阅读 [安全](/zh-Hans/server/security)。

## 2. 启动一个 Client

快速开始里先用最小的 websocket 例子即可：

```ts
import { createMdpClient } from '@modeldriveprotocol/client'

const client = createMdpClient({
  serverUrl: 'ws://127.0.0.1:7070',
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

## 3. 在 MCP 工具里试试看

当 MCP 配置生效、client 也注册完成后，直接在你配置了 MCP 的工具里和 Agent 对话，试着调用相关工具看看。

例如，可以让 Agent 先列出可用 client，或者直接调用你刚刚暴露的那个 tool。完整的 bridge surface 可继续阅读 [工具集](/zh-Hans/server/tools/)。
