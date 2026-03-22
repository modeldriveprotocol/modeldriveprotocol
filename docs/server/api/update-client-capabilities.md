---
title: updateClientCapabilities
status: Draft
---

# `updateClientCapabilities`

`updateClientCapabilities` is the client-to-server lifecycle event used to replace one or more already-registered capability catalogs without changing the client identity.

| Event Type                 | Flow Direction   |
| -------------------------- | ---------------- |
| `updateClientCapabilities` | Client -> Server |

## Data Definition

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

## Semantics

- `clientId` must match the logical client already registered on the current session.
- `capabilities` must include at least one capability group.
- Included capability groups replace the previous array for that category.
- Omitted capability groups stay unchanged.

## Examples

- Replace only tools

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

- Clear resources while keeping everything else as-is

```json
{
  "type": "updateClientCapabilities",
  "clientId": "browser-01",
  "capabilities": {
    "resources": []
  }
}
```

## When to use it

Use this event when the same connected runtime adds, removes, or replaces tools, prompts, skills, or resources after its initial registration.
