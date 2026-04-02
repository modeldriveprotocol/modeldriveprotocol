---
title: POST /mdp/http-loop/send
status: Draft
---

# `POST /mdp/http-loop/send`

Sends one client-to-server MDP message through an existing HTTP loop session.

## Request

Session identification:

- `x-mdp-session-id: <sessionId>`, or
- `?sessionId=<sessionId>`

Body:

```json
{
  "message": {
    "type": "registerClient",
    "client": {
      "id": "browser-01",
      "name": "Browser Client",
      "paths": [
        {
          "type": "endpoint",
          "method": "GET",
          "path": "/search"
        }
      ]
    }
  }
}
```

`message` must be a client-to-server message. `callClient` is not accepted here.

Typical messages sent here are:

- `registerClient`
- `updateClientCatalog`
- `unregisterClient`
- `callClientResult`

## Response

Status `202 Accepted`:

```json
{
  "ok": true
}
```

## Error cases

| Status | Shape                 | When it happens                                                    |
| ------ | --------------------- | ------------------------------------------------------------------ |
| `400`  | `{ "error": string }` | Invalid JSON, invalid message shape, or server-side handling error |
| `404`  | empty body            | Missing or unknown session ID                                      |

## Notes

- Each `/send` request refreshes the session's transport auth and last-seen time.
