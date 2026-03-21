---
title: DELETE /mdp/auth
status: Draft
---

# `DELETE /mdp/auth`

Clears the auth cookie used by browser-based clients.

## Request

No body is required.

## Response

Status `204 No Content`

Headers:

- `Set-Cookie`: cookie-clearing directive
- `Cache-Control: no-store`

## Error cases

| Status | Shape | When it happens |
| --- | --- | --- |
| `400` | `{ "error": string }` | Invalid auth request handling |
| `404` | empty body | Wrong path or unsupported method |

