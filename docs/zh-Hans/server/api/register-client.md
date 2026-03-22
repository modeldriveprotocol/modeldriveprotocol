---
title: registerClient
status: Draft
---

# `registerClient`

`registerClient` 是一个从 client 发往 server 的生命周期事件，用来上报一个 client 身份以及当前完整的 capability 目录。

如果同一个已连接 client 之后只需要修改 tools、prompts、skills 或 resources，优先使用 [updateClientCapabilities](/zh-Hans/server/api/update-client-capabilities)，而不是重新发送整份身份描述。

| 事件类型         | 事件流向         |
| ---------------- | ---------------- |
| `registerClient` | Client -> Server |

## 数据定义

```ts
interface AuthContext {
  scheme?: string
  token?: string
  headers?: Record<string, string>
  metadata?: Record<string, unknown>
}

interface ToolDescriptor {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

interface PromptArgumentDescriptor {
  name: string
  description?: string
  required?: boolean
}

interface PromptDescriptor {
  name: string
  description?: string
  arguments?: PromptArgumentDescriptor[]
}

interface SkillDescriptor {
  name: string
  description?: string
  contentType?: string
  inputSchema?: Record<string, unknown>
}

interface ResourceDescriptor {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

interface ClientDescriptor {
  id: string
  name: string
  description?: string
  version?: string
  platform?: string
  metadata?: Record<string, unknown>
  tools: ToolDescriptor[]
  prompts: PromptDescriptor[]
  skills: SkillDescriptor[]
  resources: ResourceDescriptor[]
}

interface RegisterClientMessage {
  type: 'registerClient'
  client: ClientDescriptor
  auth?: AuthContext
}
```

## 事例

- 最小 browser client 注册

```json
{
  "type": "registerClient",
  "client": {
    "id": "browser-01",
    "name": "Browser Client",
    "tools": [{ "name": "searchDom" }],
    "prompts": [],
    "skills": [],
    "resources": []
  }
}
```

- 带认证和更多能力描述的 IDE client 注册

```json
{
  "type": "registerClient",
  "client": {
    "id": "vscode-01",
    "name": "VSCode Client",
    "version": "0.1.0",
    "platform": "desktop",
    "metadata": {
      "workspaceCount": 2
    },
    "tools": [{ "name": "openFile" }],
    "prompts": [{ "name": "summarizeSelection" }],
    "skills": [{ "name": "workspace/review", "contentType": "text/markdown" }],
    "resources": [{ "uri": "workspace://root/info", "name": "Workspace Info" }]
  },
  "auth": {
    "scheme": "Bearer",
    "token": "message-token"
  }
}
```
