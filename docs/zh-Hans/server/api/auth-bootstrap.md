---
title: 鉴权引导
status: Draft
---

# 鉴权引导

浏览器 websocket client 可以通过 `/mdp/auth` 先完成 cookie auth 引导。

## `POST /mdp/auth`

请求：

```json
{
  "auth": {
    "token": "client-session-token"
  }
}
```

响应：

- 状态码 `204 No Content`
- `Set-Cookie`，内容是序列化后的 auth 上下文

如果省略 `auth`，server 会回退到从 transport 请求头中提取认证信息。

## `DELETE /mdp/auth`

响应：

- 状态码 `204 No Content`
- `Set-Cookie`，用于清除 auth cookie

## 典型链路

1. `POST /mdp/auth`
2. 收到 `Set-Cookie`
3. 在同一 origin 上打开 websocket

## transport auth 提取

默认会从以下位置提取 transport auth：

- `Authorization`
- `Cookie`
- `x-mdp-auth-` 前缀的 header

HTTP loop 和 auth 端点还会返回 CORS 头并允许携带凭据。

如果你要看字段级的请求和响应说明，继续阅读：

- [POST /mdp/auth](/zh-Hans/server/api/auth-issue)
- [DELETE /mdp/auth](/zh-Hans/server/api/auth-delete)
