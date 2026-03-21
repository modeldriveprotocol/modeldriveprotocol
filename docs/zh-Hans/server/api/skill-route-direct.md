---
title: GET /skills/:clientId/*skillPath
status: Draft
---

# `GET /skills/:clientId/*skillPath`

用于通过直接 HTTP 路由读取一个精确的 skill 节点。

## 请求

路径参数：

- `clientId`
- `skillPath`

query 参数：

- 会作为 `args.query` 透传给 skill resolver

请求头：

- 会作为 `args.headers` 透传给 skill resolver

示例：

```http
GET /skills/client-01/docs/root/child?topic=mdp
```

## 响应

状态码 `200 OK`，文本返回：

```md
# Child Skill
```

如果 skill 返回的不是字符串，server 会返回 JSON：

```json
{
  "data": {}
}
```

## 错误码

| 状态码 | 结构 | 触发条件 |
| --- | --- | --- |
| `400` | `{ "error": string }` | skill 请求格式非法 |
| `404` | 空响应体 | skill descriptor 不存在 |
| `405` | 空响应体 | 方法不是 `GET` 或 `OPTIONS` |
| `502` | `{ "error": unknown }` | 目标 client 上的 skill 调用失败 |

## 说明

- `OPTIONS` 返回 `204`。
- 返回 `405` 时会带 `Allow: GET, OPTIONS`。

