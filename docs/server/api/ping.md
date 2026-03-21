---
title: ping
status: Draft
---

# `ping`

`ping` is the heartbeat event used by either side to confirm that the websocket session is still alive.

| Event Type | Flow Direction |
| --- | --- |
| `ping` | Both directions |

## Data Definition

```ts
interface PingMessage {
  type: "ping";
  timestamp: number;
}
```

## Examples

- Server heartbeat

```json
{
  "type": "ping",
  "timestamp": 1760000000000
}
```

- Client heartbeat

```json
{
  "type": "ping",
  "timestamp": 1760000025000
}
```
