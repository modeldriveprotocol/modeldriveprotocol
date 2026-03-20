---
title: 快速开始
status: MVP
---

# 快速开始

最短的端到端路径是：

1. 启动 MDP server CLI。
2. 启动一个 MDP client。
3. 注册至少一个 capability。
4. 连接 MCP host 并调用 bridge tools。

## 1. 启动 Server CLI

```bash
npx @modeldriveprotocol/server --port 7070
```

如果包已经安装到环境里，也可以直接使用 `modeldriveprotocol-server` 这个 CLI 名称。

默认情况下，同一个 listener 会同时暴露：

- `ws://127.0.0.1:7070` 上的 WebSocket
- `http://127.0.0.1:7070/mdp/http-loop` 上的 HTTP loop

如果要暴露安全端点，可以额外提供证书与私钥：

```bash
npx @modeldriveprotocol/server --port 7070 --tls-key ./certs/server-key.pem --tls-cert ./certs/server-cert.pem
```

启用 TLS 后，端点会变成 `wss://127.0.0.1:7070` 和 `https://127.0.0.1:7070/mdp/http-loop`。

## 2. 启动一个 Client

需要直接双向会话时，用 `ws://` 或 `wss://`：

```ts
import { createMdpClient } from "@modeldriveprotocol/client";

const client = createMdpClient({
  serverUrl: "ws://127.0.0.1:7070",
  client: {
    id: "browser-01",
    name: "Browser Client"
  }
});

client.exposeTool("searchDom", async ({ query }) => ({
  query,
  matches: 3
}));

await client.connect();
client.register();
```

运行时更偏请求响应轮询，或者希望明确通过 HTTP 携带认证信息时，用 `http://` 或 `https://`：

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

client.exposeTool("searchDom", async ({ query }, context) => ({
  query,
  matches: 3,
  authToken: context.auth?.token
}));

await client.connect();
client.register();
```

如果你要走浏览器全局 bundle 路径，先加载脚本，再显式包一层异步调用：

```html
<script src="https://cdn.jsdelivr.net/npm/@modeldriveprotocol/client@latest/dist/modeldriveprotocol-client.global.js"></script>
<script>
  void (async () => {
    const client = MDP.createMdpClient({
      serverUrl: "ws://127.0.0.1:7070",
      client: {
        id: "browser-01",
        name: document.title || "Browser Client"
      }
    });

    client.exposeTool("getPageInfo", async () => ({
      title: document.title,
      url: window.location.href
    }));

    await client.connect();
    client.register();
  })();
</script>
```

## 3. 连接 MCP Host

client 注册完成后，MCP bridge 会稳定暴露这些 tools：

- `listClients`
- `listTools`
- `callTools`
- `getPrompt`
- `readResource`

registry 仍然是内存态，但 transport 已经可以变化，而不影响 MCP bridge 契约。
