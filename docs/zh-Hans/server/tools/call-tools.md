---
title: callTools
status: MVP
---

# `callTools`

`callTools` 适合在你已经明确知道 client ID 和 tool 名称时直接调用。

## 输入

```json
{
  "clientId": "browser-01",
  "toolName": "searchDom",
  "args": {
    "query": "mdp"
  },
  "auth": {
    "token": "host-token"
  }
}
```

必填字段：

- `clientId`
- `toolName`

可选字段：

- `args`
- `auth`

## 输出

成功：

```json
{
  "ok": true,
  "data": {
    "query": "mdp",
    "matches": 3
  }
}
```

失败：

```json
{
  "ok": false,
  "error": {
    "code": "handler_error",
    "message": "DOM not ready"
  }
}
```

## 适合什么时候用

- 想走最直接的 tool 调用路径
- 已经明确目标 client

