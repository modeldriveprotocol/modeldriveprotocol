---
title: 消息模型
status: MVP
---

# 消息模型

MDP transport 当前需要支持一组很小的消息集合：

- `registerClient`
- `updateClientCatalog`
- `unregisterClient`
- `callClient`
- `callClientResult`
- `ping`
- `pong`

`callClient` 应该包含：

- `requestId`
- `clientId`
- `method`
- `path`
- 可选的 `params`
- 可选的 `query`
- 可选的 `body`
- 可选的 `headers`
- 可选的 `auth`

`registerClient` 用来上报一份完整的 client descriptor。完成注册后，同一条会话还可以发送 `updateClientCatalog`，原地替换已注册的路径目录。

`updateClientCatalog` 应包含：

- `clientId`
- `paths`

`paths` 会整体替换之前注册的目录。

如果 client 需要把消息级凭据附着在注册请求上，`registerClient` 也可以携带可选的 `auth` envelope。

transport auth 不走消息体。参考实现也可以从请求头、cookie，或者在建立 `ws` / `wss` 连接前先调用 `/mdp/auth` 完成的 cookie bootstrap 中记录 transport auth。

server 发现同样不走消息体。参考 transport server 会暴露 `GET /mdp/meta`，让另一个本地进程在真正建立 client transport 之前，先判断一个端口是否正在提供 MDP。这个探针不是 MDP 消息，也不会改变上面列出的 wire message 集合。

返回结果应包含：

- `ok`
- `data`
- `error`

```json
{
  "type": "callClient",
  "requestId": "req-123",
  "clientId": "browser-01",
  "method": "GET",
  "path": "/search",
  "query": {
    "q": "MCP"
  },
  "auth": {
    "token": "host-session-token",
    "metadata": {
      "requestId": "trace-01"
    }
  }
}
```

```json
{
  "type": "updateClientCatalog",
  "clientId": "browser-01",
  "paths": [
    {
      "type": "endpoint",
      "path": "/search",
      "method": "GET"
    },
    {
      "type": "skill",
      "path": "/workspace/review/skill.md"
    }
  ]
}
```

`listClients` 会反映当前连接模式，但不会暴露具体 secret。每个 client 都包含：

- `connection.mode`：`ws` 或 `http-loop`
- `connection.secure`：`wss` / `https` 时为 `true`
- `connection.authSource`：`none`、`transport`、`message` 或 `transport+message`

当一个 server 把本地 clients proxy 到上游 hub 时，上游看到的仍然是普通 client descriptor，以及普通的 `callClient` / `callClientResult` 流量。proxy 行为是中间 server 的实现细节，不是独立的新消息族。
