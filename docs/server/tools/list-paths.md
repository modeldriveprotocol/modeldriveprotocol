---
title: listPaths
status: MVP
---

# `listPaths`

Use `listPaths` to inspect canonical path descriptors indexed by the server.

## Input

```ts
interface ListPathsInput {
  clientId?: string
  search?: string
  depth?: number
}
```

## Output

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

`clientId` is optional. `depth` must be a positive integer. If `depth` is omitted, `listPaths` returns one catalog layer by default. If `search` is provided and `depth` is omitted, the server searches the full catalog and returns every matching descriptor.

`search` uses case-insensitive substring matching against client IDs, client names, path strings, descriptions, methods, content types, and schemas.

## Use it when

- you want the canonical catalog view of registered paths
- you want to filter one client's registered paths
- you need an exact `method + path` target before calling [callPath](/server/tools/call-path)
