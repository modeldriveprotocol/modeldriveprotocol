---
title: registerClient
status: Draft
---

# `registerClient`

`registerClient` is the client-to-server lifecycle event used to publish one client identity plus its current path catalog.

If the same connected client needs to change only its registered paths later, use [updateClientCatalog](/server/api/update-client-catalog) instead of sending a whole new identity document.

| Event Type       | Flow Direction   |
| ---------------- | ---------------- |
| `registerClient` | Client -> Server |

## Data Definition

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

## Examples

- Minimal browser registration

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

- IDE registration with auth and richer metadata

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
