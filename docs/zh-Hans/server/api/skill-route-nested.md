---
title: GET /:clientId/skills/*skillPath
status: Draft
---

# `GET /:clientId/skills/*skillPath`

用于通过嵌套 HTTP 路由读取一个精确的 skill 节点。

## 请求

路径参数：

- `clientId`
- `skillPath`

query 参数和请求头的透传方式，与直接路由完全一致。

示例：

```http
GET /client-01/skills/docs/root/child?a=1
```

## 响应

状态码 `200 OK`，文本返回：

```md
# Child Skill
```

如果 skill 返回的不是字符串，server 会返回：

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

- 这个路由与 [GET /skills/:clientId/*skillPath](/zh-Hans/server/api/skill-route-direct) 在功能上等价。

