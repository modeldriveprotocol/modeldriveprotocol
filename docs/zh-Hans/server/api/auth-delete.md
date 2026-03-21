---
title: DELETE /mdp/auth
status: Draft
---

# `DELETE /mdp/auth`

用于清除浏览器 client 使用的 auth cookie。

## 请求

不要求请求体。

## 响应

状态码 `204 No Content`

响应头：

- `Set-Cookie`：用于清除 cookie 的指令
- `Cache-Control: no-store`

## 错误码

| 状态码 | 结构                  | 触发条件                           |
| ------ | --------------------- | ---------------------------------- |
| `400`  | `{ "error": string }` | auth 请求处理失败                  |
| `404`  | 空响应体              | 路径错误，或请求打到了不支持的方法 |
