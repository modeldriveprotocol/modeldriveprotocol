---
title: POST /mdp/http-loop/send
status: Draft
---

# `POST /mdp/http-loop/send`

用于通过已有的 HTTP loop session 发送一条 client-to-server MDP 消息。

## 请求

session 标识：

- `x-mdp-session-id: <sessionId>`，或
- `?sessionId=<sessionId>`

请求体：

```json
{
  "message": {
    "type": "registerClient",
    "client": {
      "id": "browser-01",
      "name": "Browser Client",
      "paths": [
        {
          "type": "endpoint",
          "method": "GET",
          "path": "/search"
        }
      ]
    }
  }
}
```

`message` 必须是 client-to-server 消息，不能是 `callClient`。

常见消息包括：

- `registerClient`
- `updateClientCatalog`
- `unregisterClient`
- `callClientResult`

## 响应

状态码 `202 Accepted`：

```json
{
  "ok": true
}
```

## 错误码

| 状态码 | 结构                  | 触发条件                                      |
| ------ | --------------------- | --------------------------------------------- |
| `400`  | `{ "error": string }` | JSON 非法、消息结构非法，或 server 处理时报错 |
| `404`  | 空响应体              | session ID 缺失或不存在                       |

## 说明

- 每次 `/send` 都会刷新该 session 的 transport auth 和最后活跃时间。
