---
title: Overview
status: Draft
---

# Protocol Overview

MDP is a discovery protocol and an RPC bridge protocol.

The client provides capabilities. The server stores and indexes them. The MCP host consumes them through a fixed bridge surface.

The wire model is transport-agnostic. The current implementation ships with:

- `ws` / `wss` sessions
- `http` / `https` loop sessions
- explicit `updateClientCapabilities` lifecycle messages for refreshing one or more capability catalogs after registration
- optional auth envelopes on `registerClient` and `callClient`
- transport auth from request headers or `/mdp/auth` cookie bootstrap
- `GET /mdp/meta` as an out-of-band probe for MDP server discovery

The current server implementation can also run in a layered topology:

- a standalone hub that owns the MCP bridge
- an edge server that accepts local client sessions
- optional upstream proxying from edge to hub

That discovery and proxy behavior is transport control-plane behavior. It does not add new MDP wire messages.

MDP capability categories:

- `tools`
- `prompts`
- `skills`
- `resources`

Each category can describe a different kind of runtime-local procedure or read-only surface.
`skills` are especially useful for progressive disclosure when a client exposes them as hierarchical Markdown documents such as `topic` and `topic/detail`.
