---
title: JVM SDK Guide
status: Draft
---

# JVM SDK Guide

Use this guide when you are developing the Java and Kotlin SDKs under `sdks/jvm`.

## What this module owns

`sdks/jvm` is split into two artifacts:

- `java-client`
  the core JVM runtime client, protocol models, registry, and transports
- `kotlin-client`
  coroutine-friendly wrappers on top of the Java client

This directory owns:

- Java-side protocol mirror types
- Java websocket and HTTP loop transports
- Kotlin coroutine wrapper ergonomics
- Gradle build, tests, and Maven publication metadata

It does not own:

- protocol source of truth under `packages/protocol`
- server routing logic under `packages/server`
- JavaScript, Python, or Rust runtime integration details

## Build and test

Use the Gradle project directly:

```bash
gradle -p sdks/jvm test
gradle -p sdks/jvm build
```

What they prove:

- `gradle -p sdks/jvm test`
  validates the Java and Kotlin package tests
- `gradle -p sdks/jvm build`
  proves the jars, sources jars, javadocs jars, and publication wiring still assemble

CI pins Gradle `8.10.2` and Java `17`. Keep local validation close to that environment when debugging version-specific issues.

## Common development workflow

Typical loop:

1. update `java-client/src/main/**` for shared runtime behavior
2. update `kotlin-client/src/main/**` only when the Kotlin wrapper surface needs to change
3. run `gradle -p sdks/jvm test`
4. if artifact metadata or publication wiring changed, run `gradle -p sdks/jvm build`

Avoid duplicating runtime logic in both modules. If the fix belongs to client lifecycle, protocol mapping, or transports, it usually belongs in `java-client`.

## Debugging expectations

Start with the narrowest layer:

- `MdpClient.java`
  lifecycle, register flow, catalog sync, invocation dispatch
- `ProtocolCodec.java`
  JSON field mapping and message decoding
- `WebSocketClientTransport.java`
  websocket framing and close handling
- `HttpLoopClientTransport.java`
  session bootstrap, polling, and disconnect behavior
- `KotlinMdpClient.kt`
  coroutine wrapper behavior and Java interop

When Java tests pass but Kotlin behavior looks wrong, verify the issue is really in the Kotlin wrapper and not in the shared Java client underneath.

## Common failure modes

- `IllegalStateException: MDP client is not connected`
  `register()` or `syncCatalog()` ran before `connect()`
- unsupported transport protocol
  the server URL scheme is not `ws`, `wss`, `http`, or `https`
- Kotlin compile errors around `CompletionStage`
  the wrapper leaked Java async types instead of using `await()`
- transport closes during polling
  inspect HTTP response codes and payloads before changing the registry or handler code

## Release and packaging notes

This SDK is published by the shared `v*` release workflow.

Local preflight:

```bash
gradle -p sdks/jvm test
gradle -p sdks/jvm build
```

Repository-side publishing expectations live in [Polyglot SDK Packages](/contributing/releasing-sdks).
