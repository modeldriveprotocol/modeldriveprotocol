---
title: updateClientCapabilities
status: Draft
---

# `updateClientCapabilities`

`updateClientCapabilities` 是一个从 client 发往 server 的生命周期事件，用来在不改变 client 身份的前提下，替换一个或多个已经注册过的 capability 目录。

| 事件类型                   | 事件流向         |
| -------------------------- | ---------------- |
| `updateClientCapabilities` | Client -> Server |

## 数据定义

```ts
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

interface ClientCapabilityUpdate {
  tools?: ToolDescriptor[]
  prompts?: PromptDescriptor[]
  skills?: SkillDescriptor[]
  resources?: ResourceDescriptor[]
}

interface UpdateClientCapabilitiesMessage {
  type: 'updateClientCapabilities'
  clientId: string
  capabilities: ClientCapabilityUpdate
}
```

## 语义

- `clientId` 必须和当前 session 上已经注册的逻辑 client 一致。
- `capabilities` 至少要带一个 capability 分组。
- 出现的 capability 分组会整体替换该类别之前的数组。
- 没出现的 capability 分组保持不变。

## 示例

- 只替换 tools

```json
{
  "type": "updateClientCapabilities",
  "clientId": "browser-01",
  "capabilities": {
    "tools": [
      { "name": "searchDom" },
      { "name": "inspectSelection" }
    ]
  }
}
```

- 清空 resources，其它目录不变

```json
{
  "type": "updateClientCapabilities",
  "clientId": "browser-01",
  "capabilities": {
    "resources": []
  }
}
```

## 什么时候用

当同一个已连接运行时在首次注册之后新增、删除或替换 tools、prompts、skills、resources 时，使用这个事件。
