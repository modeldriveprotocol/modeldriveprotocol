---
title: callPaths
status: MVP
---

# `callPaths`

Use `callPaths` to fan out one canonical path invocation to one or more clients.

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

If `clientIds` is omitted, the server auto-matches connected clients by `method + path`.

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

## Use it when

- you want the canonical multi-client fan-out path
- you want the server to auto-match clients by `method + path`
- you need one result entry per matched client
