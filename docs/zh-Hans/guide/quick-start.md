---
title: 快速开始
status: MVP
---

# 快速开始

从零到一跑通最短路径是：

1. 构建整个 workspace。
2. 启动 TypeScript MDP server。
3. 启动一个 client 进程。
4. 注册一个 tool、prompt、skill 和 resource。
5. 连接一个 MCP host，并调用 bridge tools。

```bash
pnpm install
pnpm build
node packages/server/dist/cli.js --port 7070
```

如果要暴露安全端点，可以额外提供证书与私钥：

```bash
node packages/server/dist/cli.js --port 7070 --tls-key ./certs/server-key.pem --tls-cert ./certs/server-cert.pem
```

如果先走浏览器路径，可以直接加载生成好的 bundle：

```html
<script src="/assets/modeldriveprotocol-client.global.js"></script>
```

然后创建并注册一个 client：

```html
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

  await client.connect();
  client.register();
</script>
```

MVP 当前仍然建议这条路径：

1. 启动 TypeScript MDP server。
2. 启动一个 client 进程。
3. 注册一个 tool、prompt、skill 和 resource。
4. 连接一个 MCP host，并调用 bridge tools。

当前参考 transport 选项是：

- 面向 socket 会话的 `ws://` / `wss://`
- 面向 HTTP loop 模式的 `http://` / `https://`

上面的快速路径默认走 HTTP loop，因为它同时适合浏览器和偏请求响应的运行时。如果你需要安全的 socket 会话，可以改用 `wss://`。

运行时仍然使用内存 registry，但 transport 已经可以变化，而不影响 MCP bridge 契约。
