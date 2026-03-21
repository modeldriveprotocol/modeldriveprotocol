---
title: ping
status: Draft
---

# `ping`

`ping` 是一个双向心跳事件，client 和 server 任意一方都可以用它确认 websocket 会话仍然存活。

| 事件类型 | 事件流向 |
| -------- | -------- |
| `ping`   | 双向     |

## 数据定义

```ts
interface PingMessage {
  type: 'ping'
  timestamp: number
}
```

## 事例

- server 发出的心跳

```json
{
  "type": "ping",
  "timestamp": 1760000000000
}
```

- client 主动发出的心跳

```json
{
  "type": "ping",
  "timestamp": 1760000025000
}
```
