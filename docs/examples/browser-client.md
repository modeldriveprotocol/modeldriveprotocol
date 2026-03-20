---
title: Browser Client
status: MVP
---

# Browser Client

A browser client can expose:

- page selection as a resource
- DOM search as a tool
- page summarization as a prompt
- page inspection workflow as a skill

This is the simplest path for proving the bridge model end to end.

## Minimal HTML Example

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

## Repo Example

The example starts by exposing `getPageInfo`, so the host can retrieve page title and URL before calling more specific tools.

See [the Pages-hosted browser example](/examples/browser/index.html) for a concrete starter file.
