---
title: callClientResult
status: Draft
---

# `callClientResult`

`callClientResult` 是一个从 client 发往 server 的调用事件，用来结束一次已路由请求，并返回成功结果或错误结果。

| 事件类型 | 事件流向 |
| --- | --- |
| `callClientResult` | Client -> Server |

## 数据定义

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

## 事例

- tool 调用成功

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

- prompt 解析成功

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

- client handler 执行失败

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
