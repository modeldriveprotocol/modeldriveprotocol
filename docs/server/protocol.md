---
title: Protocol Reference
status: Draft
---

# Protocol Reference

From the server's point of view, MDP is a small set of lifecycle and routing messages.

## Core flow

The main sequence is:

1. a client connects over `ws` / `wss` or `http` / `https` loop mode
2. the client sends `registerClient` with path catalog metadata
3. the server indexes that catalog in memory
4. an MCP host calls a bridge tool
5. the server routes the request as `callClient`
6. the client returns `callClientResult`

In an optional layered deployment, one edge server may mirror its locally connected clients into one upstream hub. That does not change the client-facing message set. The edge server still receives normal `registerClient` and `callClientResult` traffic from its clients and emits normal registrations and invocations toward the upstream hub.

## What the server cares about

The server runtime only needs a few protocol concepts:

- client descriptors
- path descriptors for endpoints, prompts, and skills
- invocation envelopes with optional `auth`
- heartbeat messages for connection liveness

The transport-facing control plane also includes an HTTP metadata probe at `/mdp/meta`. That probe helps one server decide whether another local port is already serving MDP and whether it should proxy upward instead of acting as the root hub.

## Read deeper

The detailed protocol pages remain the source of truth:

- [Overview](/protocol/overview)
- [Capability Model](/protocol/capability-model)
- [Progressive Disclosure](/protocol/progressive-disclosure)
- [Transport](/protocol/transport)
- [Lifecycle](/protocol/lifecycle)
- [Message Schema](/protocol/message-schema)
