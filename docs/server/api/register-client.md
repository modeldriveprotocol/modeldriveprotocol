---
title: registerClient
status: Draft
---

# `registerClient`

`registerClient` is the client-to-server lifecycle event used to publish one client identity plus its current capability catalog.

| Event Type       | Flow Direction   |
| ---------------- | ---------------- |
| `registerClient` | Client -> Server |

## Data Definition

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

## Examples

- Minimal browser registration

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

- IDE registration with auth and richer metadata

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
