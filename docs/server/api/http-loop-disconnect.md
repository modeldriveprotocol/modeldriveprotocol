---
title: POST /mdp/http-loop/disconnect
status: Draft
---

# `POST /mdp/http-loop/disconnect`

Closes one HTTP loop session.

## Request

Session identification:

- `x-mdp-session-id: <sessionId>`, or
- `?sessionId=<sessionId>`

Body:

```json
{}
```

## Response

Status `204 No Content`

## Error cases

| Status | Shape | When it happens |
| --- | --- | --- |
| `400` | `{ "error": string }` | Malformed HTTP loop request |

## Notes

- If the session does not exist, the endpoint still returns `204`.

