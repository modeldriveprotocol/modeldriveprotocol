---
title: Protocol
status: Draft
---

# Protocol

From the server's point of view, MDP is a small set of lifecycle and routing messages.

## Core flow

The main sequence is:

1. a client connects over `ws` / `wss` or `http` / `https` loop mode
2. the client sends `registerClient` with capability metadata
3. the server indexes that metadata in memory
4. an MCP host calls a bridge tool
5. the server routes the request as `callClient`
6. the client returns `callClientResult`

## What the server cares about

The server runtime only needs a few protocol concepts:

- client descriptors
- capability descriptors for tools, prompts, skills, and resources
- invocation envelopes with optional `auth`
- heartbeat messages for connection liveness

## Read deeper

The detailed protocol pages remain the source of truth:

- [Overview](/protocol/overview)
- [Capability Model](/protocol/capability-model)
- [Transport](/protocol/transport)
- [Lifecycle](/protocol/lifecycle)
- [Message Schema](/protocol/message-schema)
