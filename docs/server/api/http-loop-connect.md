---
title: POST /mdp/http-loop/connect
status: Draft
---

# `POST /mdp/http-loop/connect`

Creates one HTTP loop session.

## Request

Headers:

- `content-type: application/json`
- optional transport auth headers such as `Authorization`, `Cookie`, or `x-mdp-auth-*`

Body:

```json
{}
```

The endpoint accepts an empty JSON object.

## Response

Status `200 OK`:

```json
{
  "sessionId": "6c8a3b2b-7f2b-4be5-a2d8-1f0c8c4f8b54"
}
```

## Error cases

| Status | Shape | When it happens |
| --- | --- | --- |
| `400` | `{ "error": string }` | Invalid JSON body or malformed HTTP loop request |
| `404` | empty body | Wrong path or unsupported method on another route |

## Notes

- The returned `sessionId` is used by `/send`, `/poll`, and `/disconnect`.
- Session ID can later be supplied through `x-mdp-session-id` or the `sessionId` query parameter.

