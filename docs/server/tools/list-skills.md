---
title: listSkills
status: MVP
---

# `listSkills`

Use `listSkills` to inspect skill descriptors indexed by the server.

## Input

```json
{
  "clientId": "browser-01"
}
```

`clientId` is optional. If omitted, the server returns skills from every connected client.

## Output

```json
{
  "skills": []
}
```

Each skill descriptor includes `clientId`, `clientName`, `name`, and optional `description`, `contentType`, and `inputSchema`.

Hierarchical skill names can be used for progressive disclosure.

## Use it when

- you want to browse documented workflows
- you expect static Markdown skills or dynamic skill resolvers
- you need a skill name before calling [callSkills](/server/tools/call-skills)
