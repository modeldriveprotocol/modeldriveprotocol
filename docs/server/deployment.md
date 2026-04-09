---
title: Deployment Modes
status: Draft
---

# Deployment Modes

The server can run either as one isolated registry or as one cluster participant that discovers peers, elects a primary, and mirrors runtime-local clients to that primary.

The default CLI startup mode is `auto` on port `47372`.

## Standalone

Use standalone mode when one server owns the local registry and bridge surface.

```bash
npx @modeldriveprotocol/server --port 47372 --server-id hub
```

Use this when:

- you only need one local MDP server
- clients can register directly with the bridge-facing server
- you want the simplest local setup

## Auto

Auto mode first probes for existing MDP peers. If it finds a current primary, it follows that primary and mirrors local clients upward. If it does not, it enters the cluster control plane and can elect itself as the primary.

```bash
npx @modeldriveprotocol/server --cluster-mode auto --server-id edge-01
```

By default the discovery process:

- probes `127.0.0.1`
- starts at port `47372`
- checks up to `100` consecutive ports
- uses `GET /mdp/meta` to decide whether a port is serving MDP
- verifies that the remote metadata advertises a compatible protocol version before opening the proxy link

Once peers are connected, the cluster manager keeps the federation stable through:

- primary heartbeats on the cluster control websocket
- follower leases so secondaries do not promote too early
- randomized elections with terms when the primary lease expires
- graceful primary resignation so secondaries can elect immediately during a clean shutdown
- primary quorum checks so an isolated leader gives up leadership instead of serving indefinitely
- optional static membership so quorum can be based on one explicit server id set instead of only discovered sticky peers
- cluster identity checks so unrelated server groups do not accidentally merge just because they share a host or overlapping server ids

Tune discovery when needed:

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

When `--cluster-members` is set, the cluster uses that explicit server id set for quorum math and peer admission. Unknown peers can still exist on the network, but they do not get added to the control plane or counted toward leadership.
When `--cluster-id` is set, discovery and control-plane traffic also require that logical cluster identity to match. The default cluster id is derived from `--discover-host` and `--discover-start-port`.
Within one cluster, every `--server-id` must be unique. If another endpoint advertises the same server id under the same cluster id, the node treats that as a hard configuration error instead of silently guessing which peer is correct.

## Proxy-Required

Proxy-required mode is the strict version of auto mode at startup. The server must find another cluster peer during bootstrap or fail startup.

```bash
npx @modeldriveprotocol/server \
  --cluster-mode proxy-required \
  --discover-host 127.0.0.1 \
  --discover-start-port 47372 \
  --discover-attempts 100 \
  --server-id edge-02
```

Use this when:

- the server should never become the root bridge by accident
- your deployment expects a pre-existing cluster
- startup should fail fast instead of silently changing topology

## Explicit Upstream

If you already know one peer URL, skip scanning and seed the cluster join directly.

```bash
npx @modeldriveprotocol/server \
  --port 47170 \
  --cluster-mode proxy-required \
  --upstream-url ws://127.0.0.1:47372 \
  --server-id edge-01
```

This is the most predictable choice for scripts, tests, and fixed local development setups. After the initial join, the server still participates in term / lease / election with the rest of the cluster.

## Cluster Manifest

If you want cluster identity, membership, and discovery defaults to survive restarts without repeating a long CLI command, store them in a JSON manifest and pass `--cluster-config`.

Example manifest:

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

Start with that manifest:

```bash
npx @modeldriveprotocol/server \
  --cluster-config ./mdp-cluster.json \
  --server-id node-a
```

The manifest only provides defaults. Explicit CLI flags still win, so one node can reuse the same manifest and override only its own `--server-id`, `--port`, or a different `--cluster-id` when needed.

## Node-Local State Store

If you want a filesystem snapshot of the current node state for debugging or external supervision, enable `--state-store`.

By default the server writes `snapshot.json`, `clients.json`, `routes.json`, and `services.json` under `./.mdp/store` in the startup working directory. Use `--state-store-dir` to move that directory elsewhere.

This state store is node-local diagnostics only. It does not restore client sessions after restart and it does not replicate registry state across peers.

The files are split by concern:

- `snapshot.json`: one combined node-local snapshot with server metadata, services, clients, and routes
- `clients.json`: the current `listClients` view
- `routes.json`: the current indexed route table
- `services.json`: transport, MCP bridge, cluster, and upstream proxy status only

## Probe Endpoint

Discovery uses the metadata probe:

- `GET /mdp/meta`

Example response:

```json
{
  "protocol": "mdp",
  "protocolVersion": "2.0.0",
  "supportedProtocolRanges": ["^2.0.0"],
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

That endpoint is for deployment control-plane logic. It is not an MDP wire message.
When one server decides whether to proxy into another, it should treat `protocolVersion` as an exact semver and `supportedProtocolRanges` as semver ranges. The `cluster` block is the live control-plane view that secondaries use to find the current primary. `cluster.id` is the first isolation check: if it does not match the expected logical cluster, that peer should be ignored or rejected. `cluster.membershipMode` and `cluster.membershipFingerprint` are the next compatibility check: static peers in one cluster should agree on the same member set fingerprint, otherwise they will reject each other instead of running with mismatched quorum rules.
The extra quorum fields are there for diagnostics: `knownMemberCount` is the sticky in-memory member set, `reachableMemberCount` is the node-local live reachability view, and `hasQuorum` tells you whether that node currently sees a majority.

For the exact CLI flags and startup syntax, see [CLI Reference](/server/cli).

Two important boundaries remain:

- the cluster elects a new primary for routing, but it does not replicate live client sessions. After a primary failover, clients must reconnect to the new primary.
- membership is sticky for the lifetime of a running process. Once a peer has joined the in-memory member set, quorum does not automatically shrink just because discovery stops seeing that peer.
- if you need a stable quorum definition across restarts and topology churn, prefer `--cluster-members` so the member set is explicit instead of purely discovery-driven.
- if you use `--cluster-members`, every node in that logical cluster should use the same member set. Nodes with different static membership fingerprints will reject each other.
- if you run multiple independent MDP clusters on the same host or network segment, set `--cluster-id` explicitly so those groups cannot accidentally federate.
- when quorum is later restored, the cluster can converge again and elect a primary, but that recovery still operates on routing state, not replicated client sessions.
