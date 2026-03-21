---
title: JavaScript SDK Guide
status: Draft
---

# JavaScript SDK Guide

Use this guide when you are developing `packages/client`.

## What this module owns

`packages/client` owns:

- MDP client registration and invocation handling
- websocket and HTTP loop client transports
- procedure registry behavior
- browser entry points and global bundle output

## Build and test

Use the package-scoped commands first:

```bash
pnpm --filter @modeldriveprotocol/client build
pnpm --filter @modeldriveprotocol/client test
```

The build includes both TypeScript output and the browser bundle step from `scripts/bundle.mjs`.

## Common development workflow

Typical loop:

1. update `src/**`
2. run `pnpm --filter @modeldriveprotocol/client test`
3. run `pnpm --filter @modeldriveprotocol/client build`
4. if browser-facing behavior changed, validate the downstream app that consumes it

## Debugging expectations

This package is usually debugged in one of two ways:

- package-level tests for transport, registry, and invocation behavior
- downstream validation through the Chrome extension, VSCode extension, docs site, or smoke test

If the bug appears only in integration, expand to:

```bash
pnpm build
pnpm test
```

## Common companion modules

- `packages/protocol`
  when message shape or guards need to move first
- `apps/chrome-extension`
  when browser bundle or client transport behavior breaks an extension flow
- `apps/vscode-extension`
  when extension-host embedding exposes the bug
