---
title: Quick Start
status: Draft
---

# Java Quick Start

Use the Java SDK when your MDP client runs in a JVM service, desktop app, or plugin host.

## 1. Add the dependency

```xml
<dependency>
  <groupId>io.github.modeldriveprotocol</groupId>
  <artifactId>mdp-client-java</artifactId>
  <version>2.2.0</version>
</dependency>
```

## 2. Create a client

```java
import io.modeldriveprotocol.client.MdpClient;

MdpClient client = new MdpClient(
    "ws://127.0.0.1:47372",
    new MdpClient.ClientInfo("java-01", "Java Client")
);
```

## 3. Expose one path

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

## 4. Connect and register

```java
client.connect().toCompletableFuture().join();
client.register(null).toCompletableFuture().join();
```

## Transport support

The Java SDK currently supports:

- `ws` / `wss`
- `http` / `https` loop mode

For contributor workflow, debugging notes, and local JVM package validation, continue with [JVM SDK Guide](/contributing/modules/sdks/jvm).
