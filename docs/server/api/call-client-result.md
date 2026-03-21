---
title: callClientResult
status: Draft
---

# `callClientResult`

`callClientResult` is the client-to-server invocation event used to complete one routed request with either success data or an error.

| Event Type | Flow Direction |
| --- | --- |
| `callClientResult` | Client -> Server |

## Data Definition

```ts
interface SerializedError {
  code: string;
  message: string;
  details?: unknown;
}

interface CallClientResultMessage {
  type: "callClientResult";
  requestId: string;
  ok: boolean;
  data?: unknown;
  error?: SerializedError;
}
```

## Examples

- Tool invocation succeeds

```json
{
  "type": "callClientResult",
  "requestId": "req-01",
  "ok": true,
  "data": {
    "matches": 3
  }
}
```

- Prompt resolution succeeds

```json
{
  "type": "callClientResult",
  "requestId": "req-02",
  "ok": true,
  "data": {
    "messages": [
      {
        "role": "user",
        "content": "Summarize the active selection."
      }
    ]
  }
}
```

- Client handler fails

```json
{
  "type": "callClientResult",
  "requestId": "req-03",
  "ok": false,
  "error": {
    "code": "handler_error",
    "message": "DOM not ready"
  }
}
```
