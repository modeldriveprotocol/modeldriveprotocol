---
title: callClient
status: Draft
---

# `callClient`

`callClient` 是一个从 server 发往 client 的调用事件，用来把一次已经按 `method + path` 路由好的调用下发到目标 client。

| 事件类型     | 事件流向         |
| ------------ | ---------------- |
| `callClient` | Server -> Client |

## 数据定义

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

## 事例

- 调用一个 endpoint

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

- 带认证上下文的 prompt 路径调用

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

- 带 route params 和 body 的路径调用

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
