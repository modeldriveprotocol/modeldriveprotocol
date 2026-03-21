---
title: listTools
status: MVP
---

# `listTools`

Use `listTools` to inspect tool descriptors indexed by the server.

## Input

```json
{
  "clientId": "browser-01"
}
```

`clientId` is optional. If omitted, the server returns tools from every connected client.

## Output

```json
{
  "tools": []
}
```

Each tool descriptor includes `clientId`, `clientName`, `name`, and optional `description` and `inputSchema`.

## Use it when

- you already know you need tools, not prompts or resources
- you want to filter one client's tool catalog
- you need input schema hints before calling [callTools](/server/tools/call-tools)

