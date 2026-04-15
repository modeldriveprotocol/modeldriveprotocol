---
title: C# SDK Guide
status: Draft
---

# C# SDK Guide

Use this guide when you are developing `sdks/dotnet`.

## What this module owns

`sdks/dotnet` owns:

- C# protocol models and message helpers
- registry behavior and path matching
- websocket and HTTP loop client transports
- NuGet package metadata and .NET-side tests

It does not own:

- protocol source of truth under `packages/protocol`
- server routing logic under `packages/server`
- browser-specific auth bootstrap behavior from the JavaScript SDK

## Local setup

Use .NET 8 SDK and work from the repository root or the SDK directory:

```bash
dotnet --info
dotnet test sdks/dotnet/ModelDriveProtocol.sln
```

## Build and test

Use the SDK-scoped commands first:

```bash
dotnet test sdks/dotnet/ModelDriveProtocol.sln
dotnet pack sdks/dotnet/src/ModelDriveProtocol.Client/ModelDriveProtocol.Client.csproj -c Release -o sdks/dotnet/artifacts
```

What they prove:

- `dotnet test`
  validates registry behavior, register flow, ping/pong handling, and invocation routing
- `dotnet pack`
  proves the NuGet metadata and package build still work

## Common development workflow

Typical loop:

1. update `sdks/dotnet/src/**`
2. run `dotnet test sdks/dotnet/ModelDriveProtocol.sln`
3. if package metadata changed, run `dotnet pack ...`
4. if behavior mirrors a protocol change, verify the corresponding TypeScript protocol package too

## Debugging expectations

Start with the narrowest layer that can prove the bug:

- registry/path bugs:
  add or adjust tests in `ProcedureRegistryTests.cs`
- lifecycle bugs:
  add or adjust tests in `MdpClientTests.cs`
- transport bugs:
  isolate the transport with a fake server or injected `HttpClient` first

If you need to debug a real runtime session, capture the JSON message payload before changing the C# models. Most first-failure cases here are message-shape drift, path-shape mismatch, or reconnect assumptions in transports.

## Common failure modes

- `MDP client is not connected`
  `RegisterAsync()` or `SyncCatalogAsync()` ran before `ConnectAsync()`
- unknown path for a routed invocation
  the registered path pattern and the concrete call path do not have the same segment count
- handler error on skill or prompt paths
  a reserved `skill.md` or `prompt.md` leaf was exposed as an endpoint
- NuGet pack fails
  package metadata, README packing, or output path configuration is incomplete

## Release and packaging notes

This SDK is published by the shared `v*` release workflow as the `ModelDriveProtocol.Client` NuGet package.

Local preflight:

```bash
dotnet test sdks/dotnet/ModelDriveProtocol.sln
dotnet pack sdks/dotnet/src/ModelDriveProtocol.Client/ModelDriveProtocol.Client.csproj -c Release -o sdks/dotnet/artifacts
```

Repository-side publishing expectations live in [Polyglot SDK Packages](/contributing/releasing-sdks).
