---
title: POST /mdp/http-loop/connect
status: Draft
---

# `POST /mdp/http-loop/connect`

用于创建一个 HTTP loop session。

## 请求

请求头：

- `content-type: application/json`
- 可选 transport auth 请求头，例如 `Authorization`、`Cookie`、`x-mdp-auth-*`

请求体：

```json
{}
```

该端点接受一个空 JSON 对象。

## 响应

状态码 `200 OK`：

```json
{
  "sessionId": "6c8a3b2b-7f2b-4be5-a2d8-1f0c8c4f8b54"
}
```

## 错误码

| 状态码 | 结构                  | 触发条件                                |
| ------ | --------------------- | --------------------------------------- |
| `400`  | `{ "error": string }` | JSON 非法，或 HTTP loop 请求格式非法    |
| `404`  | 空响应体              | 路径错误，或请求打到了不支持的方法/路由 |

## 说明

- 返回的 `sessionId` 会被 `/send`、`/poll`、`/disconnect` 继续使用。
- 后续可以通过 `x-mdp-session-id` 或 `sessionId` query 参数传递 session ID。
