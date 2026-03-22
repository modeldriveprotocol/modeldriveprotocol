---
title: GET /mdp/meta
status: Draft
---

# `GET /mdp/meta`

这个接口是一个面向 transport 和部署发现的带外探针。

它让另一个本地进程在真正打开 client transport 之前，先判断某个端口是否正在提供 MDP。当前 server 实现会用它来支持可选的 upstream discovery 和 proxy 启动模式。

## 请求

```http
GET /mdp/meta
Accept: application/json
```

## 返回

```json
{
  "protocol": "mdp",
  "protocolVersion": "0.1.0",
  "supportedProtocolRanges": ["^0.1.0"],
  "serverId": "127.0.0.1:47372",
  "endpoints": {
    "ws": "ws://127.0.0.1:47372",
    "httpLoop": "http://127.0.0.1:47372/mdp/http-loop",
    "auth": "http://127.0.0.1:47372/mdp/auth",
    "meta": "http://127.0.0.1:47372/mdp/meta"
  },
  "features": {
    "upstreamProxy": true
  }
}
```

## 说明

- 这不是一个 MDP wire message。
- 它不要求 websocket 或 HTTP loop session 已经存在。
- 已经明确知道正确 `serverUrl` 的 client 不需要调用它。
- `protocolVersion` 表示这个 server 当前实现的精确协议 semver。
- `supportedProtocolRanges` 表示可接受的 semver range 列表。精确版本号本身也仍然是合法 range。
- 具备 proxy 能力的 server 在把本地 clients 镜像到上游 hub 之前，应该先确认自己要求的协议版本满足其中某个 range。
