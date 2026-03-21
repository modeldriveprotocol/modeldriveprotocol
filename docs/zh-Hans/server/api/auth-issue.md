---
title: POST /mdp/auth
status: Draft
---

# `POST /mdp/auth`

用于签发一个 auth cookie，主要给浏览器 websocket client 使用。

## 请求

请求体：

```json
{
  "auth": {
    "scheme": "Bearer",
    "token": "client-session-token"
  }
}
```

只有在请求头里已经能提取出等价认证上下文时，`auth` 才可以省略。

## 响应

状态码 `204 No Content`

响应头：

- `Set-Cookie`：序列化后的 auth cookie
- `Cache-Control: no-store`

## 错误码

| 状态码 | 结构                  | 触发条件                                           |
| ------ | --------------------- | -------------------------------------------------- |
| `400`  | `{ "error": string }` | JSON 非法、auth 结构非法，或没有可用的 auth 上下文 |
| `404`  | 空响应体              | 路径错误，或请求打到了不支持的方法                 |

## 说明

- server 会回退读取 `Authorization`、`Cookie`、`x-mdp-auth-*` 等 transport auth。
