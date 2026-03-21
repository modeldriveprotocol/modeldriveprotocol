---
title: callSkills
status: MVP
---

# `callSkills`

`callSkills` 用来解析某一个 client 上的某一个 skill。

## 输入

```json
{
  "clientId": "browser-01",
  "skillName": "workspace/review"
}
```

必填字段：

- `clientId`
- `skillName`

可选字段：

- `args`
- `auth`

## 输出

```json
{
  "ok": true,
  "data": "# Workspace Review\n\nReview the workspace root."
}
```

静态 skill 的 `data` 通常是 Markdown 文本；动态 skill 则可以返回 client 自定义 payload。

