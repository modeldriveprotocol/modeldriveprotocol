---
title: Go SDK Guide
status: Draft
---

# Go SDK Guide

Use this guide when you are developing `sdks/go`.

## What this module owns

`sdks/go` owns:

- Go protocol models and message helpers
- registry behavior and path matching
- websocket and HTTP loop client transports
- module metadata and Go-side tests

It does not own:

- protocol source of truth under `packages/protocol`
- server routing logic under `packages/server`
- browser-specific auth bootstrap behavior from the JavaScript SDK

## Local setup

Use Go 1.24 or newer and work from the SDK directory:

```bash
cd sdks/go
go env GOMOD
go test ./...
```

## Build and test

Use the module-scoped commands first:

```bash
cd sdks/go
go test ./...
go test -run TestHandlesPingAndInvocationMessages ./...
```

What they prove:

- `go test ./...`
  validates registry behavior, register flow, ping/pong handling, and module wiring
- targeted `go test -run ...`
  shortens the loop when you are isolating one lifecycle path

## Common development workflow

Typical loop:

1. update `sdks/go/*.go`
2. run `gofmt -w *.go`
3. run `go test ./...`
4. if behavior mirrors a protocol change, verify the corresponding TypeScript protocol package too

## Debugging expectations

Start with the narrowest layer that can prove the bug:

- registry/path bugs:
  add or adjust tests in `registry_test.go`
- lifecycle bugs:
  add or adjust tests in `client_test.go`
- transport bugs:
  isolate the transport with a fake server or injected HTTP/WebSocket client first

If a real runtime session fails, inspect the raw JSON shape before changing the Go models. Most first-failure cases here are path-shape mismatch, missing auth fields, or transport session assumptions.

## Common failure modes

- `MDP client is not connected`
  `Register()` or `SyncCatalog()` ran before `Connect()`
- unknown path for a routed invocation
  the registered path pattern and the concrete call path do not have the same segment count
- handler error on skill or prompt paths
  a reserved `skill.md` or `prompt.md` leaf was exposed as an endpoint
- HTTP loop session closes unexpectedly
  inspect `/connect`, `/send`, and `/poll` status codes before changing client logic

## Release and packaging notes

This SDK is source-distributed as a Go module. The shared `v*` release workflow also creates a matching prefixed tag such as `sdks/go/v2.2.0`.

Local preflight:

```bash
cd sdks/go
go test ./...
```

Repository-side publishing expectations live in [Polyglot SDK Packages](/contributing/releasing-sdks).
