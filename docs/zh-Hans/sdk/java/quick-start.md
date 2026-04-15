---
title: 简易上手
status: Draft
---

# Java SDK / 简易上手

当你的 MDP client 运行在 JVM 服务、桌面应用或插件宿主里时，使用 Java SDK。

## 1. 添加依赖

```xml
<dependency>
  <groupId>io.github.modeldriveprotocol</groupId>
  <artifactId>mdp-client-java</artifactId>
  <version>2.2.0</version>
</dependency>
```

## 2. 创建 client

```java
import io.modeldriveprotocol.client.MdpClient;

MdpClient client = new MdpClient(
    "ws://127.0.0.1:47372",
    new MdpClient.ClientInfo("java-01", "Java Client")
);
```

## 3. 暴露一个路径

```java
import java.util.Map;
import java.util.concurrent.CompletableFuture;

client.exposeEndpoint(
    "/page/search",
    MdpClient.HttpMethod.POST,
    (request, context) -> CompletableFuture.completedFuture(Map.of("matches", 0)),
    new MdpClient.EndpointOptions().description("Search the current runtime")
);
```

## 4. 连接并注册

```java
client.connect().toCompletableFuture().join();
client.register(null).toCompletableFuture().join();
```

## 当前 transport 支持

Java SDK 当前支持：

- `ws` / `wss`
- `http` / `https` loop mode

如果你要看维护者视角的开发、调试和本地验证流程，继续阅读 [JVM SDK 开发指南](/zh-Hans/contributing/modules/sdks/jvm)。
