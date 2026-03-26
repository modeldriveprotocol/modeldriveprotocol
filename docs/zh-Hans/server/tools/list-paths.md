---
title: listPaths
status: MVP
---

# `listPaths`

`listPaths` 用来查看 server 已索引的 canonical 路径 descriptor。

## 输入

```ts
interface ListPathsInput {
  clientId?: string
  search?: string
  depth?: number
}
```

## 输出

```ts
type JsonSchema = Record<string, unknown>
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

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

type IndexedPathDescriptor = PathDescriptor & {
  clientId: string
  clientName: string
}

interface ListPathsOutput {
  paths: IndexedPathDescriptor[]
}
```

`clientId` 是可选的。`depth` 必须是正整数。省略 `depth` 时，`listPaths` 默认只返回一层目录；如果提供了 `search` 但没有显式传 `depth`，server 会搜索完整目录树并返回所有命中的 descriptor。

`search` 会按大小写不敏感的子串匹配 client ID、client 名称、path、description、method、content type、schema 和 legacy alias。

## 适合什么时候用

- 想看 canonical 路径目录，而不是 legacy tool/prompt/resource 兼容别名
- 想只看某一个 client 注册了哪些路径
- 调用 [callPath](/zh-Hans/server/tools/call-path) 之前先确认精确的 `method + path`
