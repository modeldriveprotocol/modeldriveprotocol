---
title: Introduction
status: Draft
---

# Introduction

MDP is a discovery and RPC bridge protocol for exposing runtime-local procedures to AI.

The protocol exists for cases where the useful capability is already inside a process:

- a mobile app service
- a desktop app facade
- a native method on iOS or Android
- a Qt object or slot
- a browser runtime capability

MDP does not force those capabilities into static MCP tool definitions. Instead, a client registers capability metadata with a thin server, and the server exposes stable MCP bridge tools for discovery and invocation.

## Scope

MDP covers:

- client registration
- capability discovery
- routed invocation
- lifecycle tracking

It does not prescribe application business logic or UI design.

