---
title: Security
status: Draft
---

# Security

MDP should assume that a client can expose sensitive local state.

Baseline concerns:

- client authentication
- server authorization
- capability-level access control
- request logging without leaking secrets
- timeout and disconnect cleanup

The current implementation keeps this lightweight but concrete:

- transports may carry auth headers such as `Authorization`, `Cookie`, or `x-mdp-auth-*`
- `registerClient.auth` lets a client send a message-level auth envelope
- `callClient.auth` lets the server or host downlink invocation auth context to a client
- server runtime options can enforce registration and invocation authorization hooks

MDP should avoid echoing raw secrets through discovery APIs. The bridge exposes auth presence and transport mode in `listClients`, but not the secret values themselves.
