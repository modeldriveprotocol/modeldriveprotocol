---
title: GET /mdp/meta
status: Draft
---

# `GET /mdp/meta`

This endpoint is an out-of-band probe for transport and deployment discovery.

It lets another local process check whether a port is serving MDP before trying to open a client transport. The current server implementation uses it for optional upstream discovery and proxy startup modes.

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
    "meta": "http://127.0.0.1:47372/mdp/meta"
  },
  "features": {
    "upstreamProxy": true
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
