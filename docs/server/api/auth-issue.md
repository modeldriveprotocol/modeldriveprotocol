---
title: POST /mdp/auth
status: Draft
---

# `POST /mdp/auth`

Issues one auth cookie, mainly for browser websocket clients.

## Request

Body:

```json
{
  "auth": {
    "scheme": "Bearer",
    "token": "client-session-token"
  }
}
```

`auth` is optional only if equivalent auth can be extracted from request headers.

## Response

Status `204 No Content`

Headers:

- `Set-Cookie`: serialized auth cookie
- `Cache-Control: no-store`

## Error cases

| Status | Shape                 | When it happens                                                |
| ------ | --------------------- | -------------------------------------------------------------- |
| `400`  | `{ "error": string }` | Invalid JSON, invalid auth shape, or no auth context available |
| `404`  | empty body            | Wrong path or unsupported method                               |

## Notes

- The server can fall back to transport auth from `Authorization`, `Cookie`, and `x-mdp-auth-*` headers.
