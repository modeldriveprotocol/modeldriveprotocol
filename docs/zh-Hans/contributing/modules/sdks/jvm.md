---
title: JVM SDK 开发指南
status: Draft
---

# JVM SDK 开发指南

当你开发 `sdks/jvm` 下的 Java 与 Kotlin SDK 时，使用这页。

## 这个模块负责什么

`sdks/jvm` 分成两个 artifact：

- `java-client`
  负责核心 JVM runtime client、协议模型、registry 和 transports
- `kotlin-client`
  负责建立在 Java client 之上的 coroutine 友好包装层

这个目录负责：

- Java 侧协议镜像类型
- Java websocket 和 HTTP loop transport
- Kotlin coroutine 包装 API
- Gradle 构建、测试和 Maven 发布元数据

它不负责：

- `packages/protocol` 下的协议真源
- `packages/server` 下的服务端路由逻辑
- JavaScript、Python 或 Rust 的运行时接入细节

## 构建与测试

直接对 Gradle 工程运行：

```bash
gradle -p sdks/jvm test
gradle -p sdks/jvm build
```

它们分别证明：

- `gradle -p sdks/jvm test`
  验证 Java 和 Kotlin 两侧测试
- `gradle -p sdks/jvm build`
  证明 jars、sources jars、javadocs jars 和 publication wiring 仍可正确组装

CI 固定使用 Gradle `8.10.2` 和 Java `17`。如果你在本地排查版本问题，尽量靠近这个环境。

## 常见开发回路

常见回路是：

1. 先改 `java-client/src/main/**` 里的共享运行时逻辑
2. 只有 Kotlin wrapper surface 需要变化时，才去改 `kotlin-client/src/main/**`
3. 运行 `gradle -p sdks/jvm test`
4. 如果构件元数据或 publication wiring 改了，再运行 `gradle -p sdks/jvm build`

不要在两个模块里重复维护 runtime 逻辑。只要问题属于 client lifecycle、协议映射或 transport，通常都应该先落在 `java-client`。

## 调试预期

先从最小层开始：

- `MdpClient.java`
  lifecycle、register flow、catalog sync、invocation dispatch
- `ProtocolCodec.java`
  JSON 字段映射和消息解码
- `WebSocketClientTransport.java`
  websocket 分帧和 close handling
- `HttpLoopClientTransport.java`
  session bootstrap、polling 和 disconnect 行为
- `KotlinMdpClient.kt`
  coroutine wrapper 行为和 Java interop

如果 Java 测试都通过，但 Kotlin 表现异常，先确认问题真的在 Kotlin wrapper，而不是下面的共享 Java client。

## 常见故障

- `IllegalStateException: MDP client is not connected`
  在 `connect()` 前调用了 `register()` 或 `syncCatalog()`
- unsupported transport protocol
  server URL 不是 `ws`、`wss`、`http` 或 `https`
- Kotlin 对 `CompletionStage` 的编译或行为问题
  wrapper 泄漏了 Java async type，没有正确 `await()`
- polling 过程中 transport 被关闭
  先检查 HTTP 响应码和 payload，再决定要不要改 registry 或 handler 逻辑

## 发布与打包说明

这个 SDK 走共享的 `v*` release workflow。

本地发布前检查：

```bash
gradle -p sdks/jvm test
gradle -p sdks/jvm build
```

仓库侧的发布要求放在 [多语言 SDK 包发布](/zh-Hans/contributing/releasing-sdks)。
