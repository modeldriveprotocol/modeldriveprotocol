---
title: Skills Definitions
status: Draft
---

# Skills Definitions

Skills are hierarchical skill documents.
In the recommended MDP model they are authored as Markdown and organized as reserved `.../skill.md` paths so a host can read a shallow skill first and deeper skills only when needed.

## Define a skill

Use `expose()` with a `.../skill.md` path:

```ts
client.expose(
  '/workspace/review/skill.md',
  '# Workspace Review\n' +
    '\n' +
    'Review the workspace root.\n' +
    '\n' +
    'You can read `/workspace/review/files/skill.md` for file-level guidance.'
)

client.expose(
  '/workspace/review/files/skill.md',
  {
    description: 'File-level review guidance'
  },
  ({ queries, headers }) =>
    '# Workspace Review Files\n' +
    '\n' +
    `Topic: ${queries.topic ?? 'general'}\n` +
    '\n' +
    `Header: ${headers['x-review-scope'] ?? 'none'}`
)
```

The current skill descriptor matches the protocol model:

- `path`
- optional `description`
- optional `contentType`

Recommended resolver contract:

- `contentType` defaults to `text/markdown`
- `queries` contains URL query parameters
- `headers` contains HTTP request headers when the skill is read through the server HTTP route
- the return value is the Markdown body itself

Skill path format is intentionally strict:

- slash-separated segments such as `/workspace/review/files/skill.md`
- lowercase `a-z`
- digits `0-9`
- `-` and `_`
- no empty segments, trailing slash, `.`, `..`, spaces, `?`, or `#`
- the last segment must be `skill.md`

Register skills directly at canonical paths such as `/workspace/review/files/skill.md`.

## Recommended progressive-disclosure pattern

Use hierarchy in the skill path itself:

- `/workspace/review/skill.md`
- `/workspace/review/files/skill.md`
- `/workspace/review/files/typescript/skill.md`

Recommended authoring rules:

- make the root skill useful on its own
- point to deeper skill paths in plain Markdown
- keep child skills narrower and more specific than the parent
- use resources for large raw payloads, not for the readable guidance itself

## When to use a skill

Prefer a skill when:

- you want to publish reusable instructions or guidance
- you want progressive disclosure through deeper skill paths
- the content should be readable by a model directly as Markdown

Prefer a tool when the capability is a direct function call.

## How it is exposed to MCP

The server indexes skill metadata and exposes it through:

- `listPaths`
- `callPath`
- `callPaths`
- `GET /skills/:clientId/*skillPath`
- `GET /:clientId/skills/*skillPath`

The underlying client invocation still routes through `callClient` as a `GET` against the canonical skill path.
For document-style skills, the HTTP routes return Markdown directly.

For the broader capability model, see [Capability Model](/protocol/capability-model).
For the protocol-level contract, see [Progressive Disclosure](/protocol/progressive-disclosure).
