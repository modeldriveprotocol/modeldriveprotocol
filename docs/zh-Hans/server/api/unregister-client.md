---
title: unregisterClient
status: Draft
---

# `unregisterClient`

`unregisterClient` 是一个从 client 发往 server 的生命周期事件，用来移除一个逻辑 client 注册，而不要求 transport 立刻断开。

| 事件类型 | 事件流向 |
| --- | --- |
| `unregisterClient` | Client -> Server |

## 数据定义

```ts
interface UnregisterClientMessage {
  type: "unregisterClient";
  clientId: string;
}
```

## 事例

- 移除一个 browser 注册

```json
{
  "type": "unregisterClient",
  "clientId": "browser-01"
}
```

- 移除一个 IDE workspace 注册

```json
{
  "type": "unregisterClient",
  "clientId": "vscode-workspace-a"
}
```
