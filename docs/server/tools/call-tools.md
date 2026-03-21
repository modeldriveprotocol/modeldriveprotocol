---
title: callTools
status: MVP
---

# `callTools`

Use `callTools` when you know the exact client ID and tool name.

## Input

```json
{
  "clientId": "browser-01",
  "toolName": "searchDom",
  "args": {
    "query": "mdp"
  },
  "auth": {
    "token": "host-token"
  }
}
```

Required fields:

- `clientId`
- `toolName`

Optional fields:

- `args`
- `auth`

## Output

Success:

```json
{
  "ok": true,
  "data": {
    "query": "mdp",
    "matches": 3
  }
}
```

Failure:

```json
{
  "ok": false,
  "error": {
    "code": "handler_error",
    "message": "DOM not ready"
  }
}
```

## Use it when

- you want the most direct tool invocation path
- the target client is already known
