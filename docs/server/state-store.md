---
title: State Store
status: MVP
---

# State Store

Use this page when an external process needs to read the optional `./.mdp/store` directory written by `--state-store` or `--state-store-dir`.

## Scope

The state store is a node-local diagnostic snapshot.

- It is not a replication channel between MDP servers.
- It does not restore client sessions after restart.
- It is a replace-by-snapshot interface, not an append-only event log.

## Directory Lifecycle

When enabled, the server creates the store directory on startup and writes four JSON files:

- `snapshot.json`
- `clients.json`
- `routes.json`
- `services.json`

Each file is rewritten as a complete JSON document whenever the relevant node-local state changes.

## Consumer Guidance

- Prefer `snapshot.json` when you need one coherent read of server metadata, services, clients, and routes together.
- Use `clients.json`, `routes.json`, or `services.json` only when you intentionally want a narrower view.
- Re-open and re-read files on each observation. The server replaces files with fresh snapshots instead of mutating them in place.
- If you need change notifications, watch the store directory or poll `snapshot.json.updatedAt`. Do not depend on a long-lived file descriptor staying current.
- Ignore unknown fields. This is an MVP diagnostic contract and future versions may add new fields.

## Shared Conventions

- All timestamps are ISO 8601 UTC strings produced by `Date.prototype.toISOString()`.
- Every JSON file contains one complete object or array. There are no partial-line or append semantics.
- `snapshot.json` is the canonical aggregate view. The split files are convenience projections and are not written as one cross-file transaction.

## `snapshot.json`

Type:

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

Field meanings:

| Field                | Meaning                                                                           |
| -------------------- | --------------------------------------------------------------------------------- |
| `scope`              | Always `node-local`. The snapshot only describes the current server process view. |
| `updatedAt`          | Time when this aggregate snapshot was written.                                    |
| `server.serverId`    | Current node identity exposed by `/mdp/meta`.                                     |
| `server.clusterId`   | Logical cluster identity configured for this node.                                |
| `server.clusterMode` | Startup mode: `standalone`, `auto`, or `proxy-required`.                          |
| `server.cwd`         | Startup working directory used to resolve relative paths.                         |
| `server.storeDir`    | Absolute store directory path for this node.                                      |
| `server.pid`         | Current server process id.                                                        |
| `server.startedAt`   | Time when this state store instance started.                                      |
| `services`           | Same payload as `services.json`.                                                  |
| `clients`            | Same payload as `clients.json`.                                                   |
| `routes`             | Same payload as `routes.json`.                                                    |

## `clients.json`

Type:

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

This file is the current `listClients` view for the local node.

Important fields:

| Field                                               | Meaning                                                   |
| --------------------------------------------------- | --------------------------------------------------------- |
| `id` / `name`                                       | Client identity as registered with the server.            |
| `description` / `version` / `platform` / `metadata` | Optional descriptor metadata supplied by the client.      |
| `paths`                                             | Full registered catalog for that client.                  |
| `status`                                            | Currently always `online` for listed entries.             |
| `connectedAt`                                       | Time when this transport session was created.             |
| `lastSeenAt`                                        | Last client activity time seen by this node.              |
| `connection.mode`                                   | `ws` or `http-loop`.                                      |
| `connection.secure`                                 | Whether the transport is currently over a secure channel. |
| `connection.authSource`                             | Where the active auth context came from.                  |

Path descriptor variants:

| Variant    | Required fields          | Optional fields                                             |
| ---------- | ------------------------ | ----------------------------------------------------------- |
| `endpoint` | `type`, `path`, `method` | `description`, `inputSchema`, `outputSchema`, `contentType` |
| `prompt`   | `type`, `path`           | `description`, `inputSchema`, `outputSchema`                |
| `skill`    | `type`, `path`           | `description`, `contentType`                                |

For the matching bridge-tool contract, see [listClients](/server/tools/list-clients).

## `routes.json`

Type:

```ts
type IndexedPathDescriptor = PathDescriptor & {
  clientId: string
  clientName: string
}
```

This file is the current indexed route table for the local node. It is equivalent to the local `listPaths` view with full depth.

Additional fields beyond `PathDescriptor`:

| Field        | Meaning                                             |
| ------------ | --------------------------------------------------- |
| `clientId`   | Client id that currently owns this descriptor.      |
| `clientName` | Human-readable client name for the same descriptor. |

For the matching bridge-tool contract, see [listPaths](/server/tools/list-paths).

## `services.json`

Type:

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

`services.json` is the narrow service-status view for external supervision.

### `transport`

| Field                | Meaning                                                                   |
| -------------------- | ------------------------------------------------------------------------- |
| `status`             | `starting` before bind, `listening` after bind, `stopped` after shutdown. |
| `endpoints.ws`       | WebSocket endpoint for MDP clients.                                       |
| `endpoints.httpLoop` | HTTP loop connect base path.                                              |
| `endpoints.auth`     | Auth bootstrap endpoint.                                                  |
| `endpoints.meta`     | Metadata probe endpoint.                                                  |
| `endpoints.cluster`  | Cluster control WebSocket endpoint.                                       |

### `mcpBridge`

| Field    | Meaning                                                                                    |
| -------- | ------------------------------------------------------------------------------------------ |
| `status` | `starting` before MCP bridge connect, `connected` after connect, `stopped` after shutdown. |

### `cluster`

| Field    | Meaning                                                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------------------------------- |
| `status` | `disabled` in standalone mode, `starting` before cluster startup settles, `running` while active, `stopped` after shutdown. |
| `state`  | Current node-local cluster state when clustering is active.                                                                 |

`cluster.state` has the same shape as the `cluster` block returned by [`GET /mdp/meta`](/server/api/meta):

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

| Field       | Meaning                                                |
| ----------- | ------------------------------------------------------ |
| `status`    | `inactive`, `connecting`, `following`, or `stopped`.   |
| `leaderId`  | Current upstream leader id when known.                 |
| `leaderUrl` | Current upstream leader websocket URL when known.      |
| `term`      | Cluster term associated with the upstream leader view. |

## Recommended Read Patterns

| Need                                             | Read this       |
| ------------------------------------------------ | --------------- |
| One coherent snapshot for dashboards or sidecars | `snapshot.json` |
| Registered clients only                          | `clients.json`  |
| Flattened route inventory                        | `routes.json`   |
| Transport / bridge / cluster / upstream health   | `services.json` |

## Non-Goals

- No incremental diff stream
- No historical retention
- No cluster-wide merged registry
- No restart recovery
