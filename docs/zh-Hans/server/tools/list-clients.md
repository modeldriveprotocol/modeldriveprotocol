---
title: listClients
status: MVP
---

# `listClients`

`listClients` 用来查看当前 registry 状态，以及有哪些 MDP client 处于在线状态。

在 cluster 启动模式下，如果当前 MCP bridge 挂在 follower 节点上，这个调用会自动转发到当前 leader，所以返回的是当前 cluster 的有效视图，而不只是本地节点的局部状态。

## 输入

```ts
interface ListClientsInput {
  search?: string
}
```

## 输出

```ts
type JsonPrimitive = boolean | number | string | null
type JsonValue = JsonPrimitive | JsonObject | JsonValue[]

interface JsonObject {
  [key: string]: JsonValue
}

type JsonSchema = Record<string, unknown>
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type ClientConnectionMode = 'ws' | 'http-loop'
type ClientAuthSource =
  | 'none'
  | 'message'
  | 'transport'
  | 'transport+message'

interface LegacyToolAlias {
  kind: 'tool'
  name: string
}

interface LegacyPromptAlias {
  kind: 'prompt'
  name: string
}

interface LegacySkillAlias {
  kind: 'skill'
  name: string
}

interface LegacyResourceAlias {
  kind: 'resource'
  uri: string
  name?: string
}

type LegacyCapabilityAlias =
  | LegacyToolAlias
  | LegacyPromptAlias
  | LegacySkillAlias
  | LegacyResourceAlias

interface BasePathDescriptor {
  path: string
  description?: string
  legacy?: LegacyCapabilityAlias
}

interface EndpointPathDescriptor extends BasePathDescriptor {
  type: 'endpoint'
  method: HttpMethod
  inputSchema?: JsonSchema
  outputSchema?: JsonSchema
  contentType?: string
}

interface SkillPathDescriptor extends BasePathDescriptor {
  type: 'skill'
  contentType?: string
}

interface PromptPathDescriptor extends BasePathDescriptor {
  type: 'prompt'
  inputSchema?: JsonSchema
  outputSchema?: JsonSchema
}

type PathDescriptor =
  | EndpointPathDescriptor
  | SkillPathDescriptor
  | PromptPathDescriptor

interface ClientConnectionDescriptor {
  mode: ClientConnectionMode
  secure: boolean
  authSource: ClientAuthSource
}

interface ListedClient {
  id: string
  name: string
  description?: string
  version?: string
  platform?: string
  metadata?: JsonObject
  paths: PathDescriptor[]
  status: 'online'
  connectedAt: string
  lastSeenAt: string
  connection: ClientConnectionDescriptor
}

interface ListClientsOutput {
  clients: ListedClient[]
}
```

`search` 会按大小写不敏感的子串匹配 client 字段和已注册路径数据。

## 适合什么时候用

- 先确认某个运行时是否真的连上了
- 先看一眼路径摘要，再决定往哪个 client 或 descriptor 继续钻
- 排查 transport 模式或 auth 来源
