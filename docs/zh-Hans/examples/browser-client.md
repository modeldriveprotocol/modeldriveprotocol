---
title: 浏览器客户端
status: MVP
---

# 浏览器客户端

这个路径被保留下来，主要是为了兼容旧链接。按照当前文档结构，浏览器侧接入内容已经拆分到 JavaScript SDK、Chrome 插件和 Playground。

## 推荐入口

- [JavaScript / 简易上手](/zh-Hans/sdk/javascript/quick-start)
- [JavaScript / 如何使用](/zh-Hans/sdk/javascript/usage)
- [Chrome 插件](/zh-Hans/apps/chrome-extension)
- [Playground](/zh-Hans/playground/)

## 这个示例适合什么场景

浏览器 client 可以暴露：

- 页面信息作为 GET endpoint
- DOM 搜索作为 POST endpoint
- 页面摘要作为 prompt
- 页面检查工作流作为 skill

这是验证整条 bridge 链路最简单的一条路径。

## 最小 HTML 示例

### WebSocket

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>MDP Browser Client</title>
  </head>
  <body>
    <h1>MDP Browser Client</h1>
    <script src="https://cdn.jsdelivr.net/npm/@modeldriveprotocol/client@latest/dist/modeldriveprotocol-client.global.js"></script>
    <script>
      void (async () => {
        const readPageInfo = () => ({
          title: document.title,
          url: window.location.href,
          heading: document.querySelector("h1")?.textContent?.trim() ?? ""
        });
        const readInput = (request) => ({
          ...request.queries,
          ...(request.body && typeof request.body === "object" && !Array.isArray(request.body)
            ? request.body
            : {})
        });

        const client = MDP.createMdpClient({
          serverUrl: "ws://127.0.0.1:47372",
          auth: {
            token: "browser-session-token"
          },
          client: {
            id: "browser-01",
            name: document.title || "Browser Client"
          }
        });

        client.expose("/page/info", { method: "GET" }, async (_request, context) => ({
          ...readPageInfo(),
          authToken: context.auth?.token
        }));

        client.expose("/page/search", { method: "POST" }, async (request, context) => {
          const { query } = readInput(request);

          return {
            query,
            matches: typeof query === "string" && document.body.innerText.includes(query) ? 1 : 0,
            title: document.title,
            url: window.location.href,
            authToken: context.auth?.token
          };
        });

        client.expose(
          "/page/info/resource",
          { method: "GET", contentType: "application/json" },
          async () => ({
            mimeType: "application/json",
            text: JSON.stringify(readPageInfo(), null, 2)
          })
        );

        await client.connect();
        client.register();
      })();
    </script>
  </body>
</html>
```

### HTTP Loop

```html
<!doctype html>
<html>
  <body>
    <script src="https://cdn.jsdelivr.net/npm/@modeldriveprotocol/client@latest/dist/modeldriveprotocol-client.global.js"></script>
    <script>
      void (async () => {
        const readPageInfo = () => ({
          title: document.title,
          url: window.location.href
        });

        const client = MDP.createMdpClient({
          serverUrl: "http://127.0.0.1:47372",
          auth: {
            token: "browser-session-token"
          },
          client: {
            id: "browser-01",
            name: document.title || "Browser Client"
          }
        });

        client.expose("/page/info", { method: "GET" }, async (_request, context) => ({
          ...readPageInfo(),
          authToken: context.auth?.token
        }));

        await client.connect();
        client.register();
      })();
    </script>
  </body>
</html>
```

## 仓库示例

如果浏览器里的 WebSocket 需要带认证，这个示例只要传 `auth` 即可，client 会在 `connect()` 前自动 bootstrap `/mdp/auth`。

这个示例会先暴露 `GET /page/info`，这样 host 可以先拿到页面标题和 URL，再决定是否调用更具体的 endpoint。

可直接查看[部署在 Pages 上的浏览器示例](/examples/browser/index.html)作为启动模板。
如果你想看浏览器 runtime 如何接到 Pi 风格的 agent loop，可继续看 [Pi Agent Assistant](/zh-Hans/examples/pi-agent-assistant)。
如果你想要打包好的浏览器集成，优先使用 [Chrome 插件](/zh-Hans/apps/chrome-extension)。
如果你需要一个直接运行在文档站里的多连接配置界面，可使用顶层入口 [Playground](/zh-Hans/playground/)。
