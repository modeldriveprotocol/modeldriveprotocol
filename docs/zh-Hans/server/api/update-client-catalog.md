---
title: updateClientCatalog
status: Draft
---

# `updateClientCatalog`

`updateClientCatalog` 是一个从 client 发往 server 的生命周期事件，用来在不改变 client 身份的前提下，替换一个已注册的路径目录。

| 事件类型               | 事件流向         |
| ---------------------- | ---------------- |
| `updateClientCatalog`  | Client -> Server |

## 数据定义

```ts
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface PathDescriptor {
  type: 'endpoint' | 'prompt' | 'skill'
  path: string
  method?: HttpMethod
  description?: string
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  contentType?: string
}

interface UpdateClientCatalogMessage {
  type: 'updateClientCatalog'
  clientId: string
  paths: PathDescriptor[]
}
```

## 语义

- `clientId` 必须和当前 session 上已经注册的逻辑 client 一致。
- `paths` 会整体替换这个 client 在当前 session 上的上一版目录。
- 如果 client 仍然在线但暂时不暴露任何路径，可以传空数组。
- `endpoint` descriptor 带显式 HTTP 风格 `method`；`prompt` 和 `skill` 都通过 `GET` 调用。

## 示例

- 用一个 endpoint 和一个 skill 整体替换目录

```json
{
  "type": "updateClientCatalog",
  "clientId": "browser-01",
  "paths": [
    {
      "type": "endpoint",
      "method": "GET",
      "path": "/search"
    },
    {
      "type": "skill",
      "path": "/workspace/review/skill.md"
    }
  ]
}
```

- 保持连接但清空目录

```json
{
  "type": "updateClientCatalog",
  "clientId": "browser-01",
  "paths": []
}
```

## 什么时候用

当同一个已连接运行时在首次注册之后新增、删除或替换路径 descriptor 时，使用这个事件。
