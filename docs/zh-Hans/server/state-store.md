---
title: 状态目录
status: MVP
---

# 状态目录

如果有外部进程需要读取 `--state-store` 或 `--state-store-dir` 生成的 `./.mdp/store` 目录，就看这一页。

## 范围

这个状态目录是节点本地诊断快照。

- 它不是 MDP server 之间的复制通道。
- 它不会在重启后恢复 client session。
- 它是“整份快照替换”接口，不是追加式事件日志。

## 目录生命周期

启用后，server 会在启动时创建目录，并写出 4 个 JSON 文件：

- `snapshot.json`
- `clients.json`
- `routes.json`
- `services.json`

相关状态发生变化时，server 会把对应文件整份重写成新的 JSON 文档。

## 消费建议

- 如果你要一次性读取 server 元数据、services、clients 和 routes，优先读 `snapshot.json`。
- 只有在你明确只关心其中一个子视图时，再单独读取 `clients.json`、`routes.json` 或 `services.json`。
- 每次观察都重新打开并读取文件。server 会用新的快照替换旧文件，而不是在原文件上增量修改。
- 如果你需要变化通知，优先监听 store 目录，或者轮询 `snapshot.json.updatedAt`。不要依赖一个长期持有的文件描述符持续变新。
- 遇到未知字段时应忽略。这个接口目前仍属于 MVP 诊断契约，未来可能只做向前兼容的新增字段扩展。

## 共享约定

- 所有时间字段都是 ISO 8601 UTC 字符串，由 `Date.prototype.toISOString()` 生成。
- 每个 JSON 文件始终只包含一个完整对象或数组，不存在追加行语义。
- `snapshot.json` 是聚合后的 canonical 视图。拆分文件只是方便读取的投影视图，不保证跨文件的单次事务一致性。

## `snapshot.json`

类型：

```ts
interface MdpFilesystemStateSnapshot {
  scope: 'node-local'
  updatedAt: string
  server: {
    serverId: string
    clusterId: string
    clusterMode: 'standalone' | 'auto' | 'proxy-required'
    cwd: string
    storeDir: string
    pid: number
    startedAt: string
  }
  services: MdpFilesystemStateServicesSnapshot
  clients: ListedClient[]
  routes: IndexedPathDescriptor[]
}
```

字段含义：

| 字段                 | 含义                                                              |
| -------------------- | ----------------------------------------------------------------- |
| `scope`              | 固定为 `node-local`，表示它只描述当前 server 进程看到的本地视图。 |
| `updatedAt`          | 这份聚合快照写盘的时间。                                          |
| `server.serverId`    | 当前节点暴露给 `/mdp/meta` 的 server 标识。                       |
| `server.clusterId`   | 当前节点配置的逻辑 cluster 标识。                                 |
| `server.clusterMode` | 启动模式：`standalone`、`auto` 或 `proxy-required`。              |
| `server.cwd`         | server 启动时的工作目录，用于解析相对路径。                       |
| `server.storeDir`    | 当前节点使用的绝对 store 目录路径。                               |
| `server.pid`         | 当前 server 进程 id。                                             |
| `server.startedAt`   | 这一份状态目录实例启动的时间。                                    |
| `services`           | 与 `services.json` 相同的内容。                                   |
| `clients`            | 与 `clients.json` 相同的内容。                                    |
| `routes`             | 与 `routes.json` 相同的内容。                                     |

## `clients.json`

类型：

```ts
interface ClientConnectionDescriptor {
  mode: 'ws' | 'http-loop'
  secure: boolean
  authSource: 'none' | 'message' | 'transport' | 'transport+message'
}

type PathDescriptor =
  | EndpointPathDescriptor
  | SkillPathDescriptor
  | PromptPathDescriptor

interface ListedClient {
  id: string
  name: string
  description?: string
  version?: string
  platform?: string
  metadata?: JsonObject
  paths: PathDescriptor[]
  status: 'online'
  connectedAt: string
  lastSeenAt: string
  connection: ClientConnectionDescriptor
}
```

这个文件就是当前节点本地的 `listClients` 视图。

关键字段：

| 字段                                                | 含义                                       |
| --------------------------------------------------- | ------------------------------------------ |
| `id` / `name`                                       | client 注册到 server 的身份信息。          |
| `description` / `version` / `platform` / `metadata` | client 自带的可选 descriptor 元数据。      |
| `paths`                                             | 该 client 当前注册的完整 path catalog。    |
| `status`                                            | 目前列出的项恒为 `online`。                |
| `connectedAt`                                       | 这个 transport session 建立的时间。        |
| `lastSeenAt`                                        | 当前节点最后一次看到该 client 活跃的时间。 |
| `connection.mode`                                   | `ws` 或 `http-loop`。                      |
| `connection.secure`                                 | 当前 transport 是否在安全信道上。          |
| `connection.authSource`                             | 当前有效 auth 上下文来自哪里。             |

Path descriptor 变体：

| 变体       | 必填字段                 | 可选字段                                                    |
| ---------- | ------------------------ | ----------------------------------------------------------- |
| `endpoint` | `type`、`path`、`method` | `description`、`inputSchema`、`outputSchema`、`contentType` |
| `prompt`   | `type`、`path`           | `description`、`inputSchema`、`outputSchema`                |
| `skill`    | `type`、`path`           | `description`、`contentType`                                |

对应的 bridge-tool 契约可以继续看 [listClients](/zh-Hans/server/tools/list-clients)。

## `routes.json`

类型：

```ts
type IndexedPathDescriptor = PathDescriptor & {
  clientId: string
  clientName: string
}
```

这个文件是当前节点本地的索引后路由表，等价于本地 `listPaths` 的完整深度视图。

在 `PathDescriptor` 基础上额外增加：

| 字段         | 含义                                       |
| ------------ | ------------------------------------------ |
| `clientId`   | 当前拥有该 descriptor 的 client id。       |
| `clientName` | 同一个 descriptor 对应的 client 可读名称。 |

对应的 bridge-tool 契约可以继续看 [listPaths](/zh-Hans/server/tools/list-paths)。

## `services.json`

类型：

```ts
interface MdpFilesystemStateServicesSnapshot {
  transport: {
    status: 'starting' | 'listening' | 'stopped'
    endpoints?: {
      ws: string
      httpLoop: string
      auth: string
      meta: string
      cluster: string
    }
  }
  mcpBridge: {
    status: 'starting' | 'connected' | 'stopped'
  }
  cluster: {
    status: 'disabled' | 'starting' | 'running' | 'stopped'
    state?: ClusterManagerState
  }
  upstreamProxy: {
    status: 'inactive' | 'connecting' | 'following' | 'stopped'
    leaderId?: string
    leaderUrl?: string
    term?: number
  }
}
```

`services.json` 是给外部监督进程使用的精简服务状态视图。

### `transport`

| 字段                 | 含义                                                                |
| -------------------- | ------------------------------------------------------------------- |
| `status`             | 绑定前是 `starting`，开始监听后是 `listening`，关闭后是 `stopped`。 |
| `endpoints.ws`       | 面向 MDP client 的 WebSocket 入口。                                 |
| `endpoints.httpLoop` | HTTP loop connect 基础路径。                                        |
| `endpoints.auth`     | auth bootstrap 入口。                                               |
| `endpoints.meta`     | metadata probe 入口。                                               |
| `endpoints.cluster`  | cluster control WebSocket 入口。                                    |

### `mcpBridge`

| 字段     | 含义                                                                               |
| -------- | ---------------------------------------------------------------------------------- |
| `status` | MCP bridge connect 前是 `starting`，connect 后是 `connected`，关闭后是 `stopped`。 |

### `cluster`

| 字段     | 含义                                                                                                        |
| -------- | ----------------------------------------------------------------------------------------------------------- |
| `status` | standalone 模式是 `disabled`，cluster 启动尚未稳定时是 `starting`，运行中是 `running`，关闭后是 `stopped`。 |
| `state`  | cluster 启用时的当前节点本地 cluster 状态。                                                                 |

`cluster.state` 的结构与 [`GET /mdp/meta`](/zh-Hans/server/api/meta) 返回中的 `cluster` 块一致：

```ts
interface ClusterManagerState {
  id: string
  membershipMode: 'dynamic' | 'static'
  membershipFingerprint: string
  role: 'leader' | 'follower' | 'candidate'
  term: number
  leaderId?: string
  leaderUrl?: string
  leaseDurationMs: number
  knownMemberCount: number
  reachableMemberCount: number
  quorumSize: number
  hasQuorum: boolean
}
```

### `upstreamProxy`

| 字段        | 含义                                                 |
| ----------- | ---------------------------------------------------- |
| `status`    | `inactive`、`connecting`、`following` 或 `stopped`。 |
| `leaderId`  | 已知时的上游 leader id。                             |
| `leaderUrl` | 已知时的上游 leader websocket URL。                  |
| `term`      | 当前上游 leader 视图对应的 cluster term。            |

## 推荐读取方式

| 需求                                                    | 优先读取        |
| ------------------------------------------------------- | --------------- |
| 仪表盘或 sidecar 需要一份完整一致的快照                 | `snapshot.json` |
| 只关心已注册 clients                                    | `clients.json`  |
| 只关心摊平后的路由清单                                  | `routes.json`   |
| 只关心 transport / bridge / cluster / upstream 健康状态 | `services.json` |

## 非目标

- 不提供增量 diff 流
- 不提供历史保留
- 不提供 cluster 级合并 registry
- 不提供重启恢复
