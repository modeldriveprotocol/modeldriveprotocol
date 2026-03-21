---
title: readResource
status: MVP
---

# `readResource`

`readResource` 适合读取以 URI 为主键的 resource，而不是按名称调用 capability。

## 输入

```json
{
  "clientId": "browser-01",
  "uri": "webpage://active-tab/page-info"
}
```

必填字段：

- `clientId`
- `uri`

可选字段：

- `args`
- `auth`

## 输出

```json
{
  "ok": true,
  "data": {
    "mimeType": "application/json",
    "text": "{\"title\":\"MDP\"}"
  }
}
```

适合快照、文档和状态读取这类更像“资源”而不是“动作”的能力。

