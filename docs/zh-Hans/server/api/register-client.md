---
title: registerClient
status: Draft
---

# `registerClient`

`registerClient` 是一个从 client 发往 server 的生命周期事件，用来上报一个 client 身份以及当前完整的路径目录。

如果同一个已连接 client 之后只需要修改已注册路径，优先使用 [updateClientCatalog](/zh-Hans/server/api/update-client-capabilities)，而不是重新发送整份身份描述。

| 事件类型         | 事件流向         |
| ---------------- | ---------------- |
| `registerClient` | Client -> Server |

## 数据定义

```ts
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface AuthContext {
  scheme?: string
  token?: string
  headers?: Record<string, string>
  metadata?: Record<string, unknown>
}

interface EndpointPathDescriptor {
  type: 'endpoint'
  path: string
  method: HttpMethod
  description?: string
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  contentType?: string
}

interface PromptPathDescriptor {
  type: 'prompt'
  path: string
  description?: string
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
}

interface SkillPathDescriptor {
  type: 'skill'
  path: string
  description?: string
  contentType?: string
}

type PathDescriptor =
  | EndpointPathDescriptor
  | PromptPathDescriptor
  | SkillPathDescriptor

interface ClientDescriptor {
  id: string
  name: string
  description?: string
  version?: string
  platform?: string
  metadata?: Record<string, unknown>
  paths: PathDescriptor[]
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
    "paths": [
      {
        "type": "endpoint",
        "method": "GET",
        "path": "/search"
      }
    ]
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
    "version": "1.0.0",
    "platform": "desktop",
    "metadata": {
      "workspaceCount": 2
    },
    "paths": [
      {
        "type": "endpoint",
        "method": "GET",
        "path": "/files/:path"
      },
      {
        "type": "prompt",
        "path": "/workspace/summarize/prompt.md"
      },
      {
        "type": "skill",
        "path": "/workspace/review/skill.md",
        "contentType": "text/markdown"
      }
    ]
  },
  "auth": {
    "scheme": "Bearer",
    "token": "message-token"
  }
}
```
