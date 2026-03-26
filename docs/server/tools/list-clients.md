---
title: listClients
status: MVP
---

# `listClients`

Use `listClients` to inspect the current registry state and see which MDP clients are online.

In clustered startup modes, the MCP bridge forwards this call to the current leader when needed, so the result reflects the active cluster view instead of only the local node.

## Input

```ts
interface ListClientsInput {
  search?: string
}
```

## Output

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

`search` uses case-insensitive substring matching against client fields and registered path data.

## Use it first when

- you want to confirm whether a runtime is connected
- you need a quick path summary before drilling into one client or one descriptor
- you want connection metadata such as transport mode or auth source
