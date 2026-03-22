---
title: GET /:clientId/skills/*skillPath
status: Draft
---

# `GET /:clientId/skills/*skillPath`

Reads one exact skill node over the nested HTTP route.

## Request

Path parameters:

- `clientId`
- `skillPath`

Query parameters and headers are forwarded to the skill resolver in the same way as the direct route.

Example:

```http
GET /client-01/skills/docs/root/child?a=1
```

## Response

Status `200 OK` with UTF-8 text payload:

```md
# Child Skill
```

The response `Content-Type` follows the skill descriptor content type. For Markdown skills that means `text/markdown; charset=utf-8`.

If the resolved skill returns non-string data, the server responds with:

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

- This route is functionally equivalent to [GET /skills/:clientId/*skillPath](/server/api/skill-route-direct).
