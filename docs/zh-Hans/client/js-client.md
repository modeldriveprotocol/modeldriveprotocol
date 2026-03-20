---
title: JS 客户端
status: MVP
---

# JS 客户端

JavaScript client 是一个方便使用的适配器，不是协议本身。

它适合这些场景：

- 浏览器嵌入
- 基于 Node 的本地 agent
- 快速原型验证

JS client 应该暴露与其他运行时一致的抽象：注册 capability handlers、建立连接、处理路由调用、返回结果。

默认情况下，transport 由 URL scheme 决定：

- `ws://` 或 `wss://` 走 WebSocket transport
- `http://` 或 `https://` 走 HTTP loop 模式

## 构建产物

当前 client package 会产出：

- 位于 `packages/client/dist/*.js` 下的 ESM SDK 文件
- 浏览器全局 bundle `packages/client/dist/modeldriveprotocol-client.global.js`

这个全局 bundle 会把 `MDP` 挂到 `window` 上，因此普通浏览器页面可以直接这样使用：

```html
<script src="/assets/modeldriveprotocol-client.global.js"></script>
<script>
  const client = MDP.createMdpClient({
    serverUrl: "http://127.0.0.1:7070",
    auth: {
      token: "client-session-token"
    },
    client: {
      id: "browser-01",
      name: "Browser Client"
    }
  });
</script>
```

## ESM 用法

```ts
import { createMdpClient } from "@modeldriveprotocol/client";

const client = createMdpClient({
  serverUrl: "http://127.0.0.1:7070",
  auth: {
    token: "client-session-token"
  },
  client: {
    id: "browser-01",
    name: "Browser Client"
  }
});

client.exposeTool("searchDom", async ({ query }, context) => {
  return {
    query,
    matches: 3,
    authToken: context.auth?.token
  };
});

await client.connect();
client.register();
```

## 浏览器全局用法

```html
<script src="/assets/modeldriveprotocol-client.global.js"></script>
<script>
  const client = MDP.createMdpClient({
    serverUrl: "https://127.0.0.1:7070",
    client: {
      id: "browser-01",
      name: "Browser Client"
    }
  });

  client.exposeTool("searchDom", async ({ query }, context) => ({
    query,
    matches: document.body.innerText.includes(query) ? 1 : 0,
    authToken: context.auth?.token
  }));

  await client.connect();
  client.register();
</script>
```

如果需要在构造后轮换注册凭据，可以在下一次 `register()` 前调用 `client.setAuth(...)`。
