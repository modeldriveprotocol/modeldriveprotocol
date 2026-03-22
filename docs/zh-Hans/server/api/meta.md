---
title: GET /mdp/meta
status: Draft
---

# `GET /mdp/meta`

这个接口是一个面向 transport 和部署发现的带外探针。

它让另一个本地进程在真正打开 client transport 之前，先判断某个端口是否正在提供 MDP。当前 server 实现会用它来支持 peer discovery、cluster control bootstrap 和 upstream proxy 建链。

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
    "meta": "http://127.0.0.1:47372/mdp/meta",
    "cluster": "ws://127.0.0.1:47372/mdp/cluster"
  },
  "features": {
    "upstreamProxy": true,
    "clusterControl": true
  },
  "cluster": {
    "id": "127.0.0.1:47372",
    "membershipMode": "dynamic",
    "membershipFingerprint": "dynamic",
    "role": "leader",
    "term": 3,
    "leaderId": "127.0.0.1:47372",
    "leaderUrl": "ws://127.0.0.1:47372",
    "leaseDurationMs": 4000,
    "knownMemberCount": 3,
    "reachableMemberCount": 3,
    "quorumSize": 2,
    "hasQuorum": true
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
- `endpoints.cluster` 是 server-to-server 控制面 websocket，用来承载 heartbeat、leader resign 和 election。
- `cluster.id` 是逻辑 cluster identity。discovery 和 server-to-server 控制面在建链前都应该先确认这个值和期望一致。
- `cluster.membershipMode` 表示当前节点使用的是 discovery 驱动的成员模式（`dynamic`），还是显式配置的静态成员集合（`static`）。
- `cluster.membershipFingerprint` 是这个 membership 模式的兼容性标识。处于同一个静态 cluster 的节点应该完全一致。
- `serverId` 在同一个逻辑 cluster 内必须唯一。如果另一个 endpoint 用同一个 `serverId` 对外宣告，会被视为 cluster 配置错误。
- `cluster.role`、`cluster.term`、`cluster.leaderId` 描述了当前 server 看到的 HA 状态。
- `cluster.leaseDurationMs` 是从节点等待主节点 heartbeat 续租的窗口。
- `cluster.knownMemberCount` 表示当前进程已知的成员集合大小。它既可能来自 sticky 的 discovery 状态，也可能来自显式配置的静态成员列表。
- `cluster.reachableMemberCount` 表示这个节点在当前 lease 窗口内认为仍然可达的成员数，包含自己。
- `cluster.quorumSize` 表示基于已知成员集合计算出来的多数派门槛。
- `cluster.hasQuorum` 表示这个节点当前看到的可达成员是否足以形成 quorum。
- 当前实现会在进程生命周期内把 cluster membership 保存在内存里；如果 discovery 暂时看不到某个 peer，quorum 也不会自动缩小。
