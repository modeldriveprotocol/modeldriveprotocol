---
title: MDP Server Guide
status: Draft
---

# MDP Server Guide

Use this guide when you are developing the runtime under `packages/server`.

## What this module owns

`packages/server` owns:

- client session lifecycle
- in-memory registry and capability indexing
- invocation routing
- MCP bridge wiring
- websocket and HTTP loop transport serving

## Build and test

Start with the package-scoped commands:

```bash
pnpm --filter @modeldriveprotocol/server build
pnpm --filter @modeldriveprotocol/server test
```

If your change also affects protocol or client integration, expand to:

```bash
pnpm build
pnpm test
```

If your change updates shared CLI help or generated documentation blocks, also run:

```bash
pnpm docs:sync
pnpm docs:sync:check
```

`docs:sync` rewrites generated blocks in the CLI reference pages from `packages/server/dist/cli-reference.js`. `docs:sync:check` is the non-writing variant for CI and pre-merge verification. If you add another generated doc page, register it in `scripts/generated-docs.config.mjs`.

## Start the server locally

For local development, build the package first, then run the generated CLI:

```bash
pnpm --filter @modeldriveprotocol/server build
node packages/server/dist/cli.js --port 47372
```

The server prints the websocket endpoint, HTTP loop endpoint, and auth endpoint to stderr when it starts.
It also prints the metadata probe endpoint at `/mdp/meta`.

The default local websocket URL is:

```text
ws://127.0.0.1:47372
```

## Local layered topology

When you need to debug multi-server behavior locally, use one explicit hub and one edge.

Hub:

```bash
node packages/server/dist/cli.js --port 47372 --server-id hub
```

Edge with explicit upstream:

```bash
node packages/server/dist/cli.js \
  --port 47170 \
  --cluster-mode proxy-required \
  --upstream-url ws://127.0.0.1:47372 \
  --server-id edge-01
```

Edge with discovery:

```bash
node packages/server/dist/cli.js \
  --cluster-mode auto \
  --discover-host 127.0.0.1 \
  --discover-start-port 47372 \
  --discover-attempts 100 \
  --server-id edge-02
```

For the complete flag list and `--help` output shape, see [CLI Reference](/server/cli).

## Debugging workflow

The current package does not ship a dedicated `dev` or `watch` script. The common local loop is:

1. rebuild `@modeldriveprotocol/server`
2. restart `node packages/server/dist/cli.js --port 47372`
3. reconnect the client you are testing against

When debugging routing or registration behavior, keep the server terminal open and use its startup and error output as the first signal.

## Common companion modules

- `packages/protocol`
  when message shape or guards need to change first
- `packages/client`
  when the bug only reproduces through a concrete client transport
- `scripts/smoke-test.mjs`
  when you need end-to-end proof rather than isolated unit coverage
