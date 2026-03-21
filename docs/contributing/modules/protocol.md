---
title: Protocol Package Guide
status: Draft
---

# Protocol Package Guide

Use this guide when you are developing `packages/protocol`.

## What this module owns

`packages/protocol` is the pure protocol layer. It owns:

- message schema
- capability descriptors
- serialized error shape
- guards and validation helpers

## Build and test

Use the package-scoped commands first:

```bash
pnpm --filter @modeldriveprotocol/protocol build
pnpm --filter @modeldriveprotocol/protocol test
```

## Common development workflow

Start here when the change affects protocol contract rather than runtime behavior.

Typical loop:

1. update `src/models.ts`, `src/messages.ts`, `src/errors.ts`, or `src/guards.ts`
2. update focused guard or contract tests under `packages/protocol/test`
3. rebuild the package
4. only then update server or client code that consumes the contract

## Debugging expectations

This package has no runtime process to launch. Debugging is mostly:

- reading the resulting types and message shape
- running the protocol package tests
- verifying downstream compile and unit-test impact in `packages/client` and `packages/server`

If a protocol change crosses layers, validate in this order:

```bash
pnpm --filter @modeldriveprotocol/protocol test
pnpm --filter @modeldriveprotocol/client test
pnpm --filter @modeldriveprotocol/server test
pnpm test
```
