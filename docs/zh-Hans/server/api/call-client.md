---
title: callClient
status: Draft
---

# `callClient`

`callClient` 是一个从 server 发往 client 的调用事件，用来把一次已路由的 capability 调用下发到目标 client。

| 事件类型     | 事件流向         |
| ------------ | ---------------- |
| `callClient` | Server -> Client |

## 数据定义

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

## 事例

- 调用一个 tool

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

- 带认证上下文的 prompt 调用

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

- 按 URI 读取一个 resource

```json
{
  "type": "callClient",
  "requestId": "req-03",
  "clientId": "browser-01",
  "kind": "resource",
  "uri": "webpage://active-tab/page-info"
}
```
