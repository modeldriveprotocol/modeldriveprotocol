---
title: callClients
status: MVP
---

# `callClients`

`callClients` 是一个通用 bridge 工具，可以一次打到一个或多个 client。

## 输入

```json
{
  "clientIds": ["browser-01", "browser-02"],
  "kind": "tool",
  "name": "searchDom",
  "args": {
    "query": "mdp"
  }
}
```

必填字段：

- `kind`
- `name`，用于 `tool`、`prompt`、`skill`
- `uri`，用于 `resource`

可选字段：

- `clientIds`
- `args`
- `auth`

如果不传 `clientIds`，server 会按 capability 类型加 `name` 或 `uri` 自动匹配目标 client。

## 输出

```json
{
  "results": [
    {
      "clientId": "browser-01",
      "ok": true,
      "data": {
        "matches": 3
      }
    }
  ]
}
```

如果一个都匹配不到，server 返回：

```json
{
  "ok": false,
  "error": "No matching MDP clients were found"
}
```

## 适合什么时候用

- 需要一个通用入口
- 同名能力可能同时存在于多个 client
- 希望由 server 负责 fan-out

