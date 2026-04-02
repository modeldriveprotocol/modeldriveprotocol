---
title: Overview
status: Draft
---

# Protocol Overview

MDP is a discovery protocol and an RPC bridge protocol.

The client provides path descriptors. The server stores and indexes them. The MCP host consumes them through a fixed bridge surface.

The wire model is transport-agnostic. The current implementation ships with:

- `ws` / `wss` sessions
- `http` / `https` loop sessions
- explicit `updateClientCatalog` lifecycle messages for replacing the registered path catalog after registration
- optional auth envelopes on `registerClient` and `callClient`
- transport auth from request headers or `/mdp/auth` cookie bootstrap
- `GET /mdp/meta` as an out-of-band probe for MDP server discovery

The current server implementation can also run in a layered topology:

- a standalone hub that owns the MCP bridge
- an edge server that accepts local client sessions
- optional upstream proxying from edge to hub

That discovery and proxy behavior is transport control-plane behavior. It does not add new MDP wire messages.

MDP path node categories:

- `endpoint`
- `prompt`
- `skill`

Endpoint nodes use an HTTP-like shape with a concrete method plus a path pattern such as `GET /goods/:id`.
Prompt nodes use reserved leaf names that end with `/prompt.md`.
Skill nodes use reserved leaf names that end with `/skill.md`, which works well for hierarchical Markdown documents such as `/topic/skill.md` and `/topic/detail/skill.md`.

The path model is the canonical API. The JavaScript client SDK and MCP bridge still expose the older tool/prompt/skill/resource names as compatibility aliases so existing integrations can migrate incrementally.
