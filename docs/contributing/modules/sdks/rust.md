---
title: Rust SDK Guide
status: Draft
---

# Rust SDK Guide

Use this guide when you are developing `sdks/rust`.

## What this module owns

`sdks/rust` owns:

- Rust protocol model mirror types
- path matching and registry behavior
- async client lifecycle and routed invocation handling
- websocket and HTTP loop transports
- crate metadata and Rust-side tests

It does not own:

- protocol source of truth under `packages/protocol`
- MDP server behavior under `packages/server`
- JVM or Python runtime packaging concerns

## Build and test

Use the crate-scoped commands first:

```bash
cargo test --manifest-path sdks/rust/Cargo.toml
cargo package --manifest-path sdks/rust/Cargo.toml
```

What they prove:

- `cargo test`
  validates registry behavior, client lifecycle, ping/pong, and invocation handling
- `cargo package`
  proves the published crate can be assembled with the current manifest

## Common development workflow

Typical loop:

1. update `sdks/rust/src/**`
2. run `cargo test --manifest-path sdks/rust/Cargo.toml`
3. if manifest, README, or public exports changed, run `cargo package --manifest-path sdks/rust/Cargo.toml`
4. if behavior follows a protocol change, compare the Rust model with `packages/protocol/src/**`

## Debugging expectations

Start by identifying whether the bug is in:

- `src/path_utils.rs`
  path pattern validation or specificity
- `src/registry.rs`
  handler resolution and invocation shaping
- `src/client.rs`
  connection lifecycle or register/sync/disconnect flow
- `src/transport.rs`
  wire transport and session behavior

When a real transport bug appears, log the raw text frame or HTTP payload before changing typed structs. In practice the first mismatch is often JSON field naming, not async control flow.

## Common failure modes

- `NotConnected`
  `register()` or `sync_catalog()` ran before `connect()`
- `UnknownPath`
  the registered pattern and the incoming path do not match by segment count or reserved leaf shape
- handler error in `CallClientResult`
  the registered closure returned an error or expected a different request body shape
- websocket connect failure
  inspect URL scheme, TLS assumptions, and request headers before changing message logic

## Release and packaging notes

This SDK is published by the shared `v*` release workflow.

Local preflight:

```bash
cargo test --manifest-path sdks/rust/Cargo.toml
cargo package --manifest-path sdks/rust/Cargo.toml
```

Repository-side publishing expectations live in [Polyglot SDK Packages](/contributing/releasing-sdks).
