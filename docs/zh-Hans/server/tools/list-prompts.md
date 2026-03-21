---
title: listPrompts
status: MVP
---

# `listPrompts`

`listPrompts` 用来查看 server 已索引的 prompt 描述信息。

## 输入

```json
{
  "clientId": "browser-01"
}
```

`clientId` 是可选的。省略时，server 会返回所有在线 client 的 prompt。

## 输出

```json
{
  "prompts": []
}
```

每个 prompt descriptor 都包含 `clientId`、`clientName`、`name`，以及可选的 `description` 和 `arguments`。

## 适合什么时候用

- 需要 prompt 模板或 prompt builder
- 在调用 [getPrompt](/zh-Hans/server/tools/get-prompt) 之前先确认参数
