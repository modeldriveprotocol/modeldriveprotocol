---
title: 消息模型
status: MVP
---

# 消息模型

MDP transport 当前需要支持一组很小的消息集合：

- `registerClient`
- `unregisterClient`
- `callClient`
- `callClientResult`
- `ping`
- `pong`

`callClient` 应该包含：

- `requestId`
- `clientId`
- `kind`
- `name` 或 `uri`
- `args`
- 可选的 `auth`

如果 client 需要把消息级凭据附着在注册请求上，`registerClient` 也可以携带可选的 `auth` envelope。

返回结果应包含：

- `ok`
- `data`
- `error`

```json
{
  "type": "callClient",
  "requestId": "req-123",
  "clientId": "browser-01",
  "kind": "tool",
  "name": "searchDom",
  "args": {
    "query": "MCP"
  },
  "auth": {
    "token": "host-session-token",
    "metadata": {
      "requestId": "trace-01"
    }
  }
}
```

`listClients` 会反映当前连接模式，但不会暴露具体 secret。每个 client 都包含：

- `connection.mode`：`ws` 或 `http-loop`
- `connection.secure`：`wss` / `https` 时为 `true`
- `connection.authSource`：`none`、`transport`、`message` 或 `transport+message`
