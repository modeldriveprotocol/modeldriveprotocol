---
title: callPath
status: MVP
---

# `callPath`

`callPath` 适合在你已经明确知道 client ID、HTTP 风格 method 和目标 path 时直接调用。

## 输入

```ts
type JsonPrimitive = boolean | number | string | null
type JsonValue = JsonPrimitive | JsonObject | JsonValue[]

interface JsonObject {
  [key: string]: JsonValue
}

type RpcArguments = Record<string, unknown>
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface AuthContext {
  scheme?: string
  token?: string
  headers?: Record<string, string>
  metadata?: JsonObject
}

interface CallPathInput {
  clientId: string
  method: HttpMethod
  path: string
  query?: RpcArguments
  body?: JsonValue
  headers?: Record<string, string>
  auth?: AuthContext
}
```

## 输出

```ts
type JsonPrimitive = boolean | number | string | null
type JsonValue = JsonPrimitive | JsonObject | JsonValue[]

interface JsonObject {
  [key: string]: JsonValue
}

type ProtocolErrorCode =
  | 'bad_request'
  | 'not_found'
  | 'timeout'
  | 'transport_error'
  | 'handler_error'
  | 'not_ready'

interface SerializedError {
  code: ProtocolErrorCode
  message: string
  details?: JsonValue
}

interface CallPathSuccess {
  ok: true
  data?: unknown
}

interface CallPathFailure {
  ok: false
  error: SerializedError | { message: string }
}

type CallPathOutput = CallPathSuccess | CallPathFailure
```

## 适合什么时候用

- 想走 canonical 的单 client 调用路径
- 已经明确目标 client
- 目标 descriptor 已经能用精确的 `method + path` 表示
