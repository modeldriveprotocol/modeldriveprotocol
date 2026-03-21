---
title: getPrompt
status: MVP
---

# `getPrompt`

Use `getPrompt` to resolve a prompt exposed by one exact client.

## Input

```json
{
  "clientId": "browser-01",
  "promptName": "summarizeSelection",
  "args": {
    "tone": "concise"
  }
}
```

Required fields:

- `clientId`
- `promptName`

Optional fields:

- `args`
- `auth`

## Output

```json
{
  "ok": true,
  "data": {
    "messages": [
      {
        "role": "user",
        "content": "Summarize the active selection."
      }
    ]
  }
}
```

Use `getPrompt` when the result should be a prompt payload rather than an immediate side effect.

