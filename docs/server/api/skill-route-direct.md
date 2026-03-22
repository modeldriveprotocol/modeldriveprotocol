---
title: GET /skills/:clientId/*skillPath
status: Draft
---

# `GET /skills/:clientId/*skillPath`

Reads one exact skill node over the direct HTTP route.

## Request

Path parameters:

- `clientId`
- `skillPath`

Query parameters:

- forwarded to the skill resolver as `args.query`

Headers:

- forwarded to the skill resolver as `args.headers`

Example:

```http
GET /skills/client-01/docs/root/child?topic=mdp
```

## Response

Status `200 OK` with UTF-8 text payload:

```md
# Child Skill
```

The response `Content-Type` follows the skill descriptor content type. For Markdown skills that means `text/markdown; charset=utf-8`.

If the resolved skill returns non-string data, the server responds with JSON:

```json
{
  "data": {}
}
```

## Error cases

| Status | Shape                  | When it happens                              |
| ------ | ---------------------- | -------------------------------------------- |
| `400`  | `{ "error": string }`  | Invalid skill request                        |
| `404`  | empty body             | Skill descriptor not found                   |
| `405`  | empty body             | Method is not `GET` or `OPTIONS`             |
| `502`  | `{ "error": unknown }` | Skill invocation failed on the target client |

## Notes

- `OPTIONS` returns `204`.
- On `405`, the response includes `Allow: GET, OPTIONS`.
