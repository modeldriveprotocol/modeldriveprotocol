---
title: 部署模式
status: Draft
---

# 部署模式

server 可以运行成一个 standalone registry，也可以运行成一个发现 peer、参与选主、并把本地 clients 镜像到当前主节点的 cluster 成员。

CLI 默认会以 `auto` 模式在 `47372` 这个端口启动。

推荐把规则收敛成一句话：

- host 只面向一个 hub 的 bridge surface
- 运行时本地 clients 通常连接离自己最近的 edge
- 连接 hub 还是 edge，应该由部署策略决定，而不是让 client 自己猜

## Standalone

当一个 server 同时持有本地 registry 和 bridge surface 时，使用 standalone 模式。

```bash
npx @modeldriveprotocol/server --port 47372 --server-id hub
```

适合这些情况：

- 你只需要一个本地 MDP server
- clients 可以直接注册到 bridge-facing server
- 你希望本地部署尽量简单

## Auto

Auto 模式会先探测已有的 MDP peer。找到当前主节点后就把本地 clients 向上镜像；找不到时，会进入 cluster 控制面并允许自己参与选主。

```bash
npx @modeldriveprotocol/server --cluster-mode auto --server-id edge-01
```

默认发现流程会：

- 探测 `127.0.0.1`
- 从 `47372` 开始
- 最多检查连续 `100` 个端口
- 通过 `GET /mdp/meta` 判断某个端口是不是 MDP 服务
- 在真正建立 proxy 链路之前，先确认远端元数据里声明了兼容的 protocol 版本

peer 建链之后，cluster manager 会通过下面这些机制维持一致性：

- 主节点通过 cluster control websocket 发送 heartbeat
- 从节点通过 lease 避免过早提升
- lease 超时后，通过带 term 的随机化 election 选出新主节点
- 主节点优雅关闭时主动发送 resign，让从节点可以立刻重新选主
- 主节点会持续检查自己是否还握有 quorum；如果已经变成孤岛，就会主动退位
- 可选的静态 membership，让 quorum 不只是依赖 discovery 过程中学到的 sticky peers，还可以依赖显式声明的 server id 集合
- cluster identity 校验，避免两个互不相关的 server 组因为运行在同一台机器上或恰好使用了重叠的 server id 而串群

需要时可以手动调参：

```bash
npx @modeldriveprotocol/server \
  --cluster-mode auto \
  --cluster-id local-dev \
  --cluster-members node-a,node-b,node-c \
  --discover-host 127.0.0.1 \
  --discover-start-port 47372 \
  --discover-attempts 100 \
  --server-id edge-01
```

设置了 `--cluster-members` 之后，cluster 会用这组显式 server id 来做 quorum 计算和 peer 准入。网络里即使存在别的未知 peer，它们也不会自动进入控制面，更不会被计入选主多数派。
设置了 `--cluster-id` 之后，discovery 和控制面还会额外校验逻辑 cluster identity。默认值会根据 `--discover-host` 和 `--discover-start-port` 推导出来。
同一个 cluster 里的每个 `--server-id` 都必须唯一。如果另一个 endpoint 在同一个 `cluster.id` 下宣告了相同的 `serverId`，当前节点会把它当成硬错误，而不是继续猜哪个 peer 才是正确的。

## Proxy-Required

Proxy-required 是 auto 的严格版本，但这个约束只发生在启动阶段。server 启动时必须至少找到一个已有 cluster peer，否则直接启动失败。

```bash
npx @modeldriveprotocol/server \
  --cluster-mode proxy-required \
  --discover-host 127.0.0.1 \
  --discover-start-port 47372 \
  --discover-attempts 100 \
  --server-id edge-02
```

适合这些情况：

- 这个 server 绝不能意外成为根 bridge
- 你的部署明确要求先有一个 cluster
- 启动时应该快速失败，而不是悄悄切换拓扑

## 显式指定上游

如果你已经知道其中一个 peer 的 URL，就直接跳过扫描，把它作为 cluster join 的 seed。

```bash
npx @modeldriveprotocol/server \
  --port 47170 \
  --cluster-mode proxy-required \
  --upstream-url ws://127.0.0.1:47372 \
  --server-id edge-01
```

这对脚本、测试和固定的本地开发环境是最可预测的方式。完成初次加入后，这个 server 仍会继续参与 term / lease / election。

## Cluster Manifest

如果你希望 cluster identity、成员集合和 discovery 默认值可以跨重启保留下来，而不是每次都写一长串 CLI 参数，可以把它们放进一个 JSON manifest，然后通过 `--cluster-config` 加载。

示例 manifest：

```json
{
  "clusterId": "local-dev",
  "clusterMembers": ["node-a", "node-b", "node-c"],
  "discoverHost": "127.0.0.1",
  "discoverStartPort": 47372,
  "discoverAttempts": 100,
  "upstreamUrl": "ws://127.0.0.1:47372"
}
```

启动方式：

```bash
npx @modeldriveprotocol/server \
  --cluster-config ./mdp-cluster.json \
  --server-id node-a
```

manifest 只提供默认值。显式 CLI 参数仍然优先生效，所以多个节点可以复用同一份 manifest，只覆盖各自的 `--server-id`、`--port`，或者在需要时覆盖成不同的 `--cluster-id`。

## 探针接口

发现流程使用的元数据探针是：

- `GET /mdp/meta`

返回示例：

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

这个接口服务于部署控制平面逻辑，不是一个 MDP wire message。一个 server 决定是否向另一个 server 建立 proxy 关系时，应把 `protocolVersion` 视为精确 semver，把 `supportedProtocolRanges` 视为 semver range 列表。`cluster` 这一块则是当前控制面的实时视图，从节点会用它来确认谁是当前主节点。`cluster.id` 是最先要检查的隔离字段，如果它和期望的逻辑 cluster 不一致，这个 peer 就应该被忽略或拒绝。`cluster.membershipMode` 和 `cluster.membershipFingerprint` 是下一层兼容性检查：如果一组静态节点对成员集合的理解不一致，它们会直接拒绝互联，而不是在不同 quorum 规则下继续运行。新增的 quorum 字段主要用于诊断：`knownMemberCount` 是 sticky 的内存成员集合大小，`reachableMemberCount` 是当前节点本地看到的可达成员视图，`hasQuorum` 表示这个节点现在是否还能看到多数派。

如果要看精确的 CLI 参数和启动语法，继续阅读 [CLI 参数](/zh-Hans/server/cli)。

## 推荐拓扑

如果你要做分层本地部署，建议按下面的结构：

1. 一个已知端口上的 hub，例如 `47372`
2. 一个或多个运行在独立端口或临时端口上的 edge
3. 运行时本地 clients 注册到离自己最近的 edge
4. MCP hosts 只和 hub 通信

```mermaid
flowchart LR
  host["MCP Host"] <-->|"bridge tools"| hub["Hub Server"]
  hub <-->|"镜像注册<br/>代理调用"| edge["Edge Server"]
  edge <-->|"client sessions"| client["Runtime Client"]
```

## Client 应该连谁

client 不应该靠盲扫端口去猜自己该连哪个 server。

更合适的做法是：

- 显式配置正确的 `serverUrl`
- 直接连接部署策略指定的本地 edge
- 在真正打开 transport 前，通过 `/mdp/meta` 做 bootstrap 判断

如果一个运行时按预期应该接到本地 edge，尽量把这个选择放在 capability client 之外的部署层完成。

还要注意两个明确边界：

- cluster 能重新选出新的主节点继续做路由，但不会复制活跃中的 client session。主节点 failover 之后，clients 仍然需要重新连接到新的主节点。
- membership 在单个进程生命周期内是 sticky 的。某个 peer 一旦进入当前进程的内存成员集合，quorum 不会因为 discovery 暂时看不到它就自动缩小。
- 如果你希望跨重启和拓扑抖动都维持稳定的 quorum 定义，优先使用 `--cluster-members`，把成员集合显式配置出来，而不是完全交给 discovery 推断。
- 如果你使用了 `--cluster-members`，同一个逻辑 cluster 里的每个节点都应该使用完全一致的成员集合。静态 membership fingerprint 不一致的节点会互相拒绝。
- 如果你会在同一台机器或同一网段上跑多个独立的 MDP cluster，显式设置 `--cluster-id`，避免它们意外互联。
- 之后如果 quorum 又恢复了，cluster 可以重新收敛并选出新的主节点，但这个恢复仍然只覆盖路由状态，不会恢复旧主节点上的活跃 client session。
