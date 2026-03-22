---
title: GET /mdp/meta
status: Draft
---

# `GET /mdp/meta`

This endpoint is an out-of-band probe for transport and deployment discovery.

It lets another local process check whether a port is serving MDP before trying to open a client transport. The current server implementation uses it for peer discovery, cluster control bootstrap, and upstream proxy setup.

## Request

```http
GET /mdp/meta
Accept: application/json
```

## Response

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

## Notes

- This is not an MDP wire message.
- It does not require a websocket or HTTP loop session.
- Clients that already know the correct `serverUrl` do not need to call it.
- `protocolVersion` is the server's exact protocol semver.
- `supportedProtocolRanges` contains semver ranges accepted for server-to-server proxying. Exact versions are still valid ranges.
- A proxy-capable server should verify that its required protocol version satisfies one of those ranges before mirroring local clients into an upstream hub.
- `endpoints.cluster` is the server-to-server control websocket used for heartbeats, leader resignation, and elections.
- `cluster.id` is the logical cluster identity. Discovery and server-to-server control traffic should only join peers that advertise the expected cluster id.
- `cluster.role`, `cluster.term`, and `cluster.leaderId` describe the server's current HA view.
- `cluster.leaseDurationMs` is the follower lease window for primary heartbeats.
- `cluster.knownMemberCount` is the membership size known to this process. It may come from sticky discovery state or from an explicit static member list.
- `cluster.reachableMemberCount` is this node's current local view of how many members, including itself, are reachable within the lease window.
- `cluster.quorumSize` is the current majority threshold derived from the known member set.
- `cluster.hasQuorum` tells you whether this node currently sees enough reachable members to satisfy quorum.
- The current implementation keeps cluster membership in memory for the lifetime of the process; quorum does not automatically shrink just because discovery temporarily stops seeing a peer.
