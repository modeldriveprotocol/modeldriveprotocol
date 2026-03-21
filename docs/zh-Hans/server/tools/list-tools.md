---
title: listTools
status: MVP
---

# `listTools`

`listTools` 用来查看 server 已索引的 tool 描述信息。

## 输入

```json
{
  "clientId": "browser-01"
}
```

`clientId` 是可选的。省略时，server 会返回所有在线 client 的 tool。

## 输出

```json
{
  "tools": []
}
```

每个 tool descriptor 都包含 `clientId`、`clientName`、`name`，以及可选的 `description` 和 `inputSchema`。

## 适合什么时候用

- 已经明确只关心 tool
- 想只看某一个 client 的 tool 列表
- 调用 [callTools](/zh-Hans/server/tools/call-tools) 之前先确认入参结构
