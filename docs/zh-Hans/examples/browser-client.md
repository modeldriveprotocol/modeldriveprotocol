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

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>MDP Browser Client</title>
  </head>
  <body>
    <h1>MDP Browser Client</h1>
    <script src="/assets/modeldriveprotocol-client.global.js"></script>
    <script>
      const client = MDP.createMdpClient({
        serverUrl: "http://127.0.0.1:7070",
        auth: {
          token: "browser-session-token"
        },
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

      client.exposeResource(
        "webpage://active-tab/selection",
        async () => ({
          mimeType: "text/plain",
          text: window.getSelection()?.toString() ?? ""
        }),
        {
          name: "Current Selection",
          mimeType: "text/plain"
        }
      );

      await client.connect();
      client.register();
    </script>
  </body>
</html>
```

## 仓库示例

可直接查看[部署在 Pages 上的浏览器示例](/examples/browser/index.html)作为启动模板。
