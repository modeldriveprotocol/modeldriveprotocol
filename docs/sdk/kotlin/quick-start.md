---
title: Quick Start
status: Draft
---

# Kotlin Quick Start

Use the Kotlin SDK when you want coroutine-friendly client registration and handler wiring on top of the JVM core SDK.

## 1. Add the dependency

```kotlin
dependencies {
  implementation("io.github.modeldriveprotocol:mdp-client-kotlin:2.2.0")
}
```

## 2. Create a client

```kotlin
import io.modeldriveprotocol.client.MdpClient
import io.modeldriveprotocol.kotlin.KotlinMdpClient

val client = KotlinMdpClient.create(
  "ws://127.0.0.1:47372",
  MdpClient.ClientInfo("kotlin-01", "Kotlin Client"),
)
```

## 3. Expose one path

```kotlin
client.exposeEndpoint(
  "/page/search",
  MdpClient.HttpMethod.POST,
) { _, _ ->
  mapOf("matches" to 0)
}
```

## 4. Connect and register

```kotlin
client.connect()
client.register()
```

## Transport support

The Kotlin SDK currently wraps the Java transport implementations and supports:

- `ws` / `wss`
- `http` / `https` loop mode

For contributor workflow, debugging notes, and local JVM package validation, continue with [JVM SDK Guide](/contributing/modules/sdks/jvm).
