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

The MVP can remain simple, but the protocol should leave room for stronger auth and policy layers.

