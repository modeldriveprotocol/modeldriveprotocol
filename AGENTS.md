# AGENTS.md

This file is for AI agents and automated contributors working in this repository.

## Project Purpose

This repository implements Model Drive Protocol (MDP):

- clients expose capabilities
- the MDP server registers and routes those capabilities
- the MDP server exposes a fixed MCP bridge surface to hosts

The repository is intentionally split so protocol models, server runtime, client runtime, and docs can evolve without collapsing into one package.

## Read This Repo In This Order

If you are new to the project, read files in this order:

1. [README.md](./README.md)
2. [docs/protocol/overview.md](./docs/protocol/overview.md)
3. [packages/protocol/src/models.ts](./packages/protocol/src/models.ts)
4. [packages/protocol/src/messages.ts](./packages/protocol/src/messages.ts)
5. [packages/server/src/mdp-server.ts](./packages/server/src/mdp-server.ts)
6. [packages/server/src/transport-server.ts](./packages/server/src/transport-server.ts)
7. [packages/server/src/mcp-bridge.ts](./packages/server/src/mcp-bridge.ts)
8. [packages/client/src/mdp-client.ts](./packages/client/src/mdp-client.ts)
9. [scripts/smoke-test.mjs](./scripts/smoke-test.mjs)
10. [packages/protocol/test/guards.test.ts](./packages/protocol/test/guards.test.ts)
11. [packages/client/test/mdp-client.test.ts](./packages/client/test/mdp-client.test.ts)
12. [packages/server/test/invocation-router.test.ts](./packages/server/test/invocation-router.test.ts)

That order mirrors the intended abstraction stack:

- project intent
- protocol contract
- server routing model
- client embedding model
- end-to-end verification
- focused unit-test expectations

## Workspace Map

### `packages/protocol`

Pure protocol layer.

Read here when working on:

- message schema
- capability descriptors
- error model
- guards and validation helpers

Key files:

- [packages/protocol/src/models.ts](./packages/protocol/src/models.ts)
- [packages/protocol/src/messages.ts](./packages/protocol/src/messages.ts)
- [packages/protocol/src/errors.ts](./packages/protocol/src/errors.ts)
- [packages/protocol/src/guards.ts](./packages/protocol/src/guards.ts)
- [packages/protocol/test/guards.test.ts](./packages/protocol/test/guards.test.ts)

### `packages/server`

MDP server runtime plus MCP bridge.

Read here when working on:

- client registration lifecycle
- capability indexing
- invocation routing
- MCP bridge tools
- WebSocket / HTTP loop transports
- TLS listener setup
- transport-carried authentication

Key files:

- [packages/server/src/mdp-server.ts](./packages/server/src/mdp-server.ts)
- [packages/server/src/client-session.ts](./packages/server/src/client-session.ts)
- [packages/server/src/capability-index.ts](./packages/server/src/capability-index.ts)
- [packages/server/src/invocation-router.ts](./packages/server/src/invocation-router.ts)
- [packages/server/src/mcp-bridge.ts](./packages/server/src/mcp-bridge.ts)
- [packages/server/src/transport-server.ts](./packages/server/src/transport-server.ts)
- [packages/server/src/ws-server.ts](./packages/server/src/ws-server.ts)
- [packages/server/src/cli.ts](./packages/server/src/cli.ts)
- [packages/server/test/capability-index.test.ts](./packages/server/test/capability-index.test.ts)
- [packages/server/test/invocation-router.test.ts](./packages/server/test/invocation-router.test.ts)
- [packages/server/test/mdp-server.test.ts](./packages/server/test/mdp-server.test.ts)
- [packages/server/test/transport-server.test.ts](./packages/server/test/transport-server.test.ts)

### `packages/client`

Client SDK and browser bundle entry points.

Read here when working on:

- capability exposure APIs
- client registration
- invocation dispatch
- browser embedding
- transport replacement

Key files:

- [packages/client/src/mdp-client.ts](./packages/client/src/mdp-client.ts)
- [packages/client/src/http-loop-client.ts](./packages/client/src/http-loop-client.ts)
- [packages/client/src/procedure-registry.ts](./packages/client/src/procedure-registry.ts)
- [packages/client/src/ws-client.ts](./packages/client/src/ws-client.ts)
- [packages/client/src/browser-entry.ts](./packages/client/src/browser-entry.ts)
- [packages/client/src/global.ts](./packages/client/src/global.ts)
- [packages/client/test/procedure-registry.test.ts](./packages/client/test/procedure-registry.test.ts)
- [packages/client/test/mdp-client.test.ts](./packages/client/test/mdp-client.test.ts)
- [packages/client/test/browser-entry.test.ts](./packages/client/test/browser-entry.test.ts)

### `docs`

VitePress documentation site.

Read here when working on:

- protocol explanations
- examples
- quick start
- roadmap
- GitHub Pages behavior

Key files:

- [docs/.vitepress/config.mts](./docs/.vitepress/config.mts)
- [docs/protocol/message-schema.md](./docs/protocol/message-schema.md)
- [docs/protocol/mcp-bridge.md](./docs/protocol/mcp-bridge.md)
- [docs/client/js-client.md](./docs/client/js-client.md)
- [docs/reference/roadmap.md](./docs/reference/roadmap.md)

### `scripts`

Repo-level utilities.

Key files:

- [scripts/smoke-test.mjs](./scripts/smoke-test.mjs)
- [scripts/prepare-docs.mjs](./scripts/prepare-docs.mjs)
- [scripts/clean.mjs](./scripts/clean.mjs)

## Generated Files

Do not hand-edit generated outputs unless you are explicitly debugging generated output.

Generated or build-derived paths include:

- `packages/*/dist/**`
- `packages/*/*.tsbuildinfo`
- `docs/.vitepress/dist/**`
- `docs/public/assets/modeldriveprotocol-client.global.js`
- `docs/public/assets/modeldriveprotocol-client.global.js.map`

If you need to change behavior, edit `src/**` or scripts, then rebuild.

## Test Layout

Vitest is configured at the repo root in:

- [vitest.config.ts](./vitest.config.ts)

Package-level unit tests live in:

- `packages/protocol/test/**`
- `packages/client/test/**`
- `packages/server/test/**`

Use unit tests for behavior that should stay stable within one layer:

- protocol parsing and guard semantics
- client registry and invocation behavior
- server indexing, routing, and lifecycle behavior

Use the smoke test for the full chain:

- client build output
- server startup
- MCP bridge reachability
- end-to-end invocation

## How To Validate Changes

Use these commands:

```bash
pnpm test:unit
pnpm build
pnpm test
pnpm docs:build
```

What they prove:

- `pnpm test:unit`
  runs Vitest unit coverage for protocol, client, and server packages
- `pnpm build`
  builds protocol, client, browser bundle, and server
- `pnpm test`
  runs unit tests first, then the smoke test that exercises server startup, client registration, and MCP bridge calls
- `pnpm docs:build`
  prepares static docs assets and builds the VitePress site

If you are editing only one package, these narrower commands are available too:

```bash
pnpm --filter @modeldriveprotocol/protocol test
pnpm --filter @modeldriveprotocol/client test
pnpm --filter @modeldriveprotocol/server test
```

## Safe Change Strategy

When changing code, keep these rules in mind:

- protocol changes should start in `packages/protocol`
- server changes should not encode browser-specific assumptions
- client changes should not encode server implementation details
- docs should describe protocol behavior, not accidental implementation quirks

If a change touches multiple layers, update them in this order:

1. protocol types
2. server runtime
3. client runtime
4. package unit tests
5. smoke test
6. docs

## Current Architectural Assumptions

As of the current MVP:

- MDP-side transports are `ws` / `wss` and `http` / `https` loop
- registry is in-memory only
- MCP-side surface is fixed bridge tools
- clients are the capability source
- the server is a registry and invocation router, not the capability owner
- registration and invocation messages may carry auth envelopes
- transport requests may also carry auth headers for server-side policy

If you change any of those assumptions, update:

- [README.md](./README.md)
- [docs/protocol/overview.md](./docs/protocol/overview.md)
- [docs/protocol/message-schema.md](./docs/protocol/message-schema.md)
- [docs/reference/roadmap.md](./docs/reference/roadmap.md)

## Places Where Agents Commonly Waste Time

Avoid these mistakes:

- reading `dist/**` before `src/**`
- changing docs without checking whether `prepare-docs.mjs` copies generated assets
- adding runtime-specific assumptions into the protocol package
- adding dynamic MCP tool generation when the repo is intentionally using a fixed bridge surface
- skipping unit tests and relying only on the smoke test
- expanding transports before understanding `ClientSession`, `CapabilityIndex`, `InvocationRouter`, and `MdpTransportServer`

## Recommended Next Work

If no specific feature is requested, the best next areas to inspect are:

- protocol lifecycle semantics
- server hardening and test coverage
- browser bootstrap flow
- alternate transport support
- auth and policy hooks
