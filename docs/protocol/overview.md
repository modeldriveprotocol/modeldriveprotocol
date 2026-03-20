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
- optional auth envelopes on `registerClient` and `callClient`

MDP capability categories:

- `tools`
- `prompts`
- `skills`
- `resources`

Each category can describe a different kind of runtime-local procedure or read-only surface.
