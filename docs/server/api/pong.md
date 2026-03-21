---
title: pong
status: Draft
---

# `pong`

`pong` is the heartbeat acknowledgement event used by either side to reply to a received `ping`.

| Event Type | Flow Direction  |
| ---------- | --------------- |
| `pong`     | Both directions |

## Data Definition

```ts
interface PongMessage {
  type: 'pong'
  timestamp: number
}
```

## Examples

- Reply to a server heartbeat

```json
{
  "type": "pong",
  "timestamp": 1760000000000
}
```

- Reply to a client heartbeat

```json
{
  "type": "pong",
  "timestamp": 1760000025000
}
```
