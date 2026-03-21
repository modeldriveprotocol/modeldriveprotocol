---
title: callClients
status: MVP
---

# `callClients`

`callClients` is the generic bridge tool. It can target one or many clients.

## Input

```json
{
  "clientIds": ["browser-01", "browser-02"],
  "kind": "tool",
  "name": "searchDom",
  "args": {
    "query": "mdp"
  }
}
```

Required fields:

- `kind`
- `name` for `tool`, `prompt`, and `skill`
- `uri` for `resource`

Optional fields:

- `clientIds`
- `args`
- `auth`

If `clientIds` is omitted, the server auto-matches clients by capability kind plus `name` or `uri`.

## Output

```json
{
  "results": [
    {
      "clientId": "browser-01",
      "ok": true,
      "data": {
        "matches": 3
      }
    }
  ]
}
```

If no clients match, the server returns:

```json
{
  "ok": false,
  "error": "No matching MDP clients were found"
}
```

## Use it when

- you want one generic entry point
- the same capability may exist on several clients
- you want server-side fan-out without calling each client separately
