---
title: listResources
status: MVP
---

# `listResources`

`listResources` 用来查看 server 已索引的 resource 描述信息。

## 输入

```json
{
  "clientId": "browser-01"
}
```

`clientId` 是可选的。省略时，server 会返回所有在线 client 的 resource。

## 输出

```json
{
  "resources": []
}
```

每个 resource descriptor 都包含 `clientId`、`clientName`、`uri`、`name`，以及可选的 `description` 和 `mimeType`。

## 适合什么时候用

- 能力是通过 URI 标识，而不是通过名称标识
- 调用 [readResource](/zh-Hans/server/tools/read-resource) 前先确认有哪些 resource
