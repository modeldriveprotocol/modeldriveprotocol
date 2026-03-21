---
title: pong
status: Draft
---

# `pong`

`pong` 是一个双向心跳确认事件，用来响应一条已经收到的 `ping`。

| 事件类型 | 事件流向 |
| --- | --- |
| `pong` | 双向 |

## 数据定义

```ts
interface PongMessage {
  type: "pong";
  timestamp: number;
}
```

## 事例

- 对 server 心跳的确认

```json
{
  "type": "pong",
  "timestamp": 1760000000000
}
```

- 对 client 心跳的确认

```json
{
  "type": "pong",
  "timestamp": 1760000025000
}
```
