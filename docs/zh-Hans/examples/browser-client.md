---
title: 浏览器客户端
status: MVP
---

# 浏览器客户端

浏览器 client 可以暴露：

- 页面选区作为 resource
- DOM 搜索作为 tool
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

        const client = MDP.createMdpClient({
          serverUrl: "ws://127.0.0.1:7070",
          client: {
            id: "browser-01",
            name: document.title || "Browser Client"
          }
        });

        client.exposeTool("getPageInfo", async (_args, context) => ({
          ...readPageInfo(),
          authToken: context.auth?.token
        }));

        client.exposeTool("searchDom", async ({ query }, context) => ({
          query,
          matches: document.body.innerText.includes(query) ? 1 : 0,
          title: document.title,
          url: window.location.href,
          authToken: context.auth?.token
        }));

        client.exposeResource(
          "webpage://active-tab/page-info",
          async () => ({
            mimeType: "application/json",
            text: JSON.stringify(readPageInfo(), null, 2)
          }),
          {
            name: "Current Page Info",
            mimeType: "application/json"
          }
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
          serverUrl: "http://127.0.0.1:7070",
          auth: {
            token: "browser-session-token"
          },
          client: {
            id: "browser-01",
            name: document.title || "Browser Client"
          }
        });

        client.exposeTool("getPageInfo", async (_args, context) => ({
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

这个示例会先暴露 `getPageInfo`，这样 host 可以先拿到页面标题和 URL，再决定是否调用更具体的工具。

可直接查看[部署在 Pages 上的浏览器示例](/examples/browser/index.html)作为启动模板。
