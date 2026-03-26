---
title: callPaths
status: MVP
---

# `callPaths`

`callPaths` 用来把一次 canonical 路径调用 fan-out 到一个或多个 client。

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

interface CallPathsInput {
  clientIds?: string[]
  method: HttpMethod
  path: string
  query?: RpcArguments
  body?: JsonValue
  headers?: Record<string, string>
  auth?: AuthContext
}
```

如果省略 `clientIds`，server 会按 `method + path` 自动匹配所有已连接 client。

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

interface CallPathsSuccessEntry {
  clientId: string
  ok: true
  data?: unknown
}

interface CallPathsFailureEntry {
  clientId: string
  ok: false
  error?: SerializedError | { message: string } | unknown
}

type CallPathsResultEntry =
  | CallPathsSuccessEntry
  | CallPathsFailureEntry

interface CallPathsOutput {
  results: CallPathsResultEntry[]
}
```

## 适合什么时候用

- 想走 canonical 的多 client fan-out 路径
- 想让 server 按 `method + path` 自动匹配 client
- 需要拿到每个命中 client 的单独结果
