---
title: GET /mdp/http-loop/poll
status: Draft
---

# `GET /mdp/http-loop/poll`

Receives one server-to-client MDP message from an existing HTTP loop session.

## Request

Query parameters:

- `sessionId`: required if not sent in `x-mdp-session-id`
- `waitMs`: optional long-poll timeout hint

Example:

```http
GET /mdp/http-loop/poll?sessionId=SESSION_ID&waitMs=25000
```

`waitMs` is clamped to `60000`. Invalid or missing values fall back to the server's configured long-poll timeout.

## Response

Status `200 OK`:

```json
{
  "message": {
    "type": "callClient",
    "requestId": "req-01",
    "clientId": "browser-01",
    "kind": "tool",
    "name": "searchDom",
    "args": {
      "query": "mdp"
    }
  }
}
```

Status `204 No Content`:

- no queued message became available before timeout

## Error cases

| Status | Shape                 | When it happens               |
| ------ | --------------------- | ----------------------------- |
| `404`  | empty body            | Missing or unknown session ID |
| `400`  | `{ "error": string }` | Malformed HTTP loop request   |

## Notes

- Each `/poll` request refreshes the session's transport auth and last-seen time.
