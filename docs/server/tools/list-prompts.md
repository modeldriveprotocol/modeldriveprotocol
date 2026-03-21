---
title: listPrompts
status: MVP
---

# `listPrompts`

Use `listPrompts` to inspect prompt descriptors indexed by the server.

## Input

```json
{
  "clientId": "browser-01"
}
```

`clientId` is optional. If omitted, the server returns prompts from every connected client.

## Output

```json
{
  "prompts": []
}
```

Each prompt descriptor includes `clientId`, `clientName`, `name`, and optional `description` and `arguments`.

## Use it when

- you need prompt templates or prompt builders
- you want to discover prompt arguments before calling [getPrompt](/server/tools/get-prompt)
