---
title: readResource
status: MVP
---

# `readResource`

Use `readResource` when the target is identified by URI rather than by capability name.

## Input

```json
{
  "clientId": "browser-01",
  "uri": "webpage://active-tab/page-info"
}
```

Required fields:

- `clientId`
- `uri`

Optional fields:

- `args`
- `auth`

## Output

```json
{
  "ok": true,
  "data": {
    "mimeType": "application/json",
    "text": "{\"title\":\"MDP\"}"
  }
}
```

Use this path for snapshots, documents, and state reads that are better modeled as resources than actions.

