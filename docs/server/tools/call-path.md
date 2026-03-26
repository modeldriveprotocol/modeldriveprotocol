---
title: callPath
status: MVP
---

# `callPath`

Use `callPath` when you know the exact client ID, HTTP-like method, and path you want to invoke.

## Input

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

## Output

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

## Use it when

- you want the canonical one-client invocation path
- the target client is already known
- the target descriptor is identified by exact `method + path`
