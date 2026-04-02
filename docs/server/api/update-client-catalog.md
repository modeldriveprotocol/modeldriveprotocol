---
title: updateClientCatalog
status: Draft
---

# `updateClientCatalog`

`updateClientCatalog` is the client-to-server lifecycle event used to replace the already-registered path catalog for one connected client without changing the client identity.

| Event Type            | Flow Direction   |
| --------------------- | ---------------- |
| `updateClientCatalog` | Client -> Server |

## Data Definition

```ts
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface PathDescriptor {
  type: 'endpoint' | 'prompt' | 'skill'
  path: string
  method?: HttpMethod
  description?: string
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  contentType?: string
}

interface UpdateClientCatalogMessage {
  type: 'updateClientCatalog'
  clientId: string
  paths: PathDescriptor[]
}
```

## Semantics

- `clientId` must match the logical client already registered on the current session.
- `paths` replaces the previous catalog for that client on the same session.
- Use an empty array when the client remains connected but should temporarily expose no paths.
- Endpoint descriptors carry an explicit HTTP-like `method`; prompt and skill descriptors are invoked with `GET`.

## Examples

- Replace the whole catalog with one endpoint and one skill

```json
{
  "type": "updateClientCatalog",
  "clientId": "browser-01",
  "paths": [
    {
      "type": "endpoint",
      "method": "GET",
      "path": "/search"
    },
    {
      "type": "skill",
      "path": "/workspace/review/skill.md"
    }
  ]
}
```

- Clear the catalog without disconnecting

```json
{
  "type": "updateClientCatalog",
  "clientId": "browser-01",
  "paths": []
}
```

## When to use it

Use this event when the same connected runtime adds, removes, or replaces path descriptors after its initial registration.
