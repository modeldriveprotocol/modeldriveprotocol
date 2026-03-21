---
title: callClient
status: Draft
---

# `callClient`

`callClient` is the server-to-client invocation event used to deliver one routed capability call to a connected client.

| Event Type   | Flow Direction   |
| ------------ | ---------------- |
| `callClient` | Server -> Client |

## Data Definition

```ts
type CapabilityKind = 'tool' | 'prompt' | 'skill' | 'resource'

type RpcArguments = Record<string, unknown>

interface AuthContext {
  scheme?: string
  token?: string
  headers?: Record<string, string>
  metadata?: Record<string, unknown>
}

interface CallClientMessage {
  type: 'callClient'
  requestId: string
  clientId: string
  kind: CapabilityKind
  name?: string
  uri?: string
  args?: RpcArguments
  auth?: AuthContext
}
```

## Examples

- Call one tool on one browser client

```json
{
  "type": "callClient",
  "requestId": "req-01",
  "clientId": "browser-01",
  "kind": "tool",
  "name": "searchDom",
  "args": {
    "query": "mdp"
  }
}
```

- Resolve one prompt with forwarded auth

```json
{
  "type": "callClient",
  "requestId": "req-02",
  "clientId": "vscode-01",
  "kind": "prompt",
  "name": "summarizeSelection",
  "args": {
    "tone": "concise"
  },
  "auth": {
    "token": "host-token"
  }
}
```

- Read one resource by URI

```json
{
  "type": "callClient",
  "requestId": "req-03",
  "clientId": "browser-01",
  "kind": "resource",
  "uri": "webpage://active-tab/page-info"
}
```
