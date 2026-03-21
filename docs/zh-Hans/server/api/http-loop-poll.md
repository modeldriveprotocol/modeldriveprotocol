---
title: GET /mdp/http-loop/poll
status: Draft
---

# `GET /mdp/http-loop/poll`

用于从已有的 HTTP loop session 拉取一条 server-to-client MDP 消息。

## 请求

query 参数：

- `sessionId`：如果没有通过 `x-mdp-session-id` 传递，则这里必填
- `waitMs`：可选 long-poll 等待时间

示例：

```http
GET /mdp/http-loop/poll?sessionId=SESSION_ID&waitMs=25000
```

`waitMs` 最大会被限制到 `60000`。如果缺失或非法，会回退到 server 的默认 long-poll 超时时间。

## 响应

状态码 `200 OK`：

```json
{
  "message": {
    "type": "callClient",
    "requestId": "req-01",
    "clientId": "browser-01",
    "kind": "tool",
    "name": "searchDom",
    "args": {
      "query": "mdp"
    }
  }
}
```

状态码 `204 No Content`：

- 在超时前没有可返回的排队消息

## 错误码

| 状态码 | 结构                  | 触发条件                |
| ------ | --------------------- | ----------------------- |
| `404`  | 空响应体              | session ID 缺失或不存在 |
| `400`  | `{ "error": string }` | HTTP loop 请求格式非法  |

## 说明

- 每次 `/poll` 都会刷新该 session 的 transport auth 和最后活跃时间。
