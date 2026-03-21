---
title: listResources
status: MVP
---

# `listResources`

Use `listResources` to inspect resource descriptors indexed by the server.

## Input

```json
{
  "clientId": "browser-01"
}
```

`clientId` is optional. If omitted, the server returns resources from every connected client.

## Output

```json
{
  "resources": []
}
```

Each resource descriptor includes `clientId`, `clientName`, `uri`, `name`, and optional `description` and `mimeType`.

## Use it when

- the capability is identified by URI instead of by name
- you need to inspect available resources before calling [readResource](/server/tools/read-resource)
