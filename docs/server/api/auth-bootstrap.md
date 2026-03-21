---
title: Auth Bootstrap
status: Draft
---

# Auth Bootstrap

Browser websocket clients can bootstrap cookie-based auth through `/mdp/auth`.

## `POST /mdp/auth`

Request:

```json
{
  "auth": {
    "token": "client-session-token"
  }
}
```

Response:

- status `204 No Content`
- `Set-Cookie` carrying the serialized auth context

If `auth` is omitted, the server falls back to transport auth extracted from request headers.

## `DELETE /mdp/auth`

Response:

- status `204 No Content`
- `Set-Cookie` clearing the auth cookie

## Typical flow

1. `POST /mdp/auth`
2. receive `Set-Cookie`
3. open the websocket connection on the same origin

## Transport auth extraction

By default, the server extracts transport auth from:

- `Authorization`
- `Cookie`
- headers prefixed with `x-mdp-auth-`

The HTTP loop and auth endpoints also send CORS headers and allow credentials.

For field-level request and response details, continue with:

- [POST /mdp/auth](/server/api/auth-issue)
- [DELETE /mdp/auth](/server/api/auth-delete)
