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

## Repo Example

See [the Pages-hosted browser example](/examples/browser/index.html) for a concrete starter file.
