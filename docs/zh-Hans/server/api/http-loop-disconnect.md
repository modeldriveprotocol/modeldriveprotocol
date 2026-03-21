---
title: POST /mdp/http-loop/disconnect
status: Draft
---

# `POST /mdp/http-loop/disconnect`

用于关闭一个 HTTP loop session。

## 请求

session 标识：

- `x-mdp-session-id: <sessionId>`，或
- `?sessionId=<sessionId>`

请求体：

```json
{}
```

## 响应

状态码 `204 No Content`

## 错误码

| 状态码 | 结构                  | 触发条件               |
| ------ | --------------------- | ---------------------- |
| `400`  | `{ "error": string }` | HTTP loop 请求格式非法 |

## 说明

- 即便 session 不存在，当前实现也会返回 `204`。
