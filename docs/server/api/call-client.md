---
title: callClient
status: Draft
---

# `callClient`

`callClient` is the server-to-client invocation event used to deliver one routed method+path call to a connected client.

| Event Type   | Flow Direction   |
| ------------ | ---------------- |
| `callClient` | Server -> Client |

## Data Definition

```ts
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
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
  method: HttpMethod
  path: string
  params?: RpcArguments
  query?: RpcArguments
  body?: unknown
  headers?: Record<string, string>
  auth?: AuthContext
}
```

## Examples

- Call one endpoint on one browser client

```json
{
  "type": "callClient",
  "requestId": "req-01",
  "clientId": "browser-01",
  "method": "GET",
  "path": "/search",
  "query": {
    "q": "mdp"
  }
}
```

- Resolve one prompt path with forwarded auth

```json
{
  "type": "callClient",
  "requestId": "req-02",
  "clientId": "vscode-01",
  "method": "GET",
  "path": "/workspace/summarize/prompt.md",
  "query": {
    "tone": "concise"
  },
  "auth": {
    "token": "host-token"
  }
}
```

- Call one path with route params and a request body

```json
{
  "type": "callClient",
  "requestId": "req-03",
  "clientId": "browser-01",
  "method": "POST",
  "path": "/todos/42",
  "params": {
    "id": "42"
  },
  "body": {
    "done": true
  },
  "headers": {
    "x-trace-id": "trace-01"
  }
}
```
