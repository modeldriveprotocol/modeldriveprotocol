---
title: listSkills
status: MVP
---

# `listSkills`

`listSkills` 用来查看 server 已索引的 skill 描述信息。

## 输入

```json
{
  "clientId": "browser-01"
}
```

`clientId` 是可选的。省略时，server 会返回所有在线 client 的 skill。

## 输出

```json
{
  "skills": []
}
```

每个 skill descriptor 都包含 `clientId`、`clientName`、`name`，以及可选的 `description`、`contentType`、`inputSchema`。

分层 skill 名称可用于渐进式披露。

## 适合什么时候用

- 想浏览工作流或文档型能力
- 需要静态 Markdown skill 或动态 skill resolver
- 在调用 [callSkills](/zh-Hans/server/tools/call-skills) 之前先拿到 skill 名称
