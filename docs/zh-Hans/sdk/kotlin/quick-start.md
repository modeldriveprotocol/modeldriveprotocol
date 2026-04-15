---
title: 简易上手
status: Draft
---

# Kotlin SDK / 简易上手

当你希望在 JVM core SDK 之上使用 coroutine 风格的注册和 handler API 时，使用 Kotlin SDK。

## 1. 添加依赖

```kotlin
dependencies {
  implementation("io.github.modeldriveprotocol:mdp-client-kotlin:2.2.0")
}
```

## 2. 创建 client

```kotlin
import io.modeldriveprotocol.client.MdpClient
import io.modeldriveprotocol.kotlin.KotlinMdpClient

val client = KotlinMdpClient.create(
  "ws://127.0.0.1:47372",
  MdpClient.ClientInfo("kotlin-01", "Kotlin Client"),
)
```

## 3. 暴露一个路径

```kotlin
client.exposeEndpoint(
  "/page/search",
  MdpClient.HttpMethod.POST,
) { _, _ ->
  mapOf("matches" to 0)
}
```

## 4. 连接并注册

```kotlin
client.connect()
client.register()
```

## 当前 transport 支持

Kotlin SDK 目前复用 Java transport，实现上支持：

- `ws` / `wss`
- `http` / `https` loop mode

如果你要看维护者视角的开发、调试和本地验证流程，继续阅读 [JVM SDK 开发指南](/zh-Hans/contributing/modules/sdks/jvm)。
