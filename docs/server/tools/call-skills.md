---
title: callSkills
status: MVP
---

# `callSkills`

Use `callSkills` to resolve one skill from one exact client.

## Input

```json
{
  "clientId": "browser-01",
  "skillName": "workspace/review"
}
```

Required fields:

- `clientId`
- `skillName`

Optional fields:

- `args`
- `auth`

## Output

```json
{
  "ok": true,
  "data": "# Workspace Review\n\nReview the workspace root."
}
```

For static skills, `data` is often Markdown text. For dynamic skills, it can be any client-defined payload.
