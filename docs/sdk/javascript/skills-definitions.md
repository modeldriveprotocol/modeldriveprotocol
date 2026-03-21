---
title: Skills Definitions
status: Draft
---

# Skills Definitions

Skills are named skill documents.
In the recommended MDP model they are authored as Markdown and organized with hierarchical names so a host can read a shallow skill first and deeper skills only when needed.

## Define a skill

Use `exposeSkill(name, resolver, options?)`:

```ts
client.exposeSkill(
  "workspace/review",
  () =>
    "# Workspace Review\n" +
    "\n" +
    "Review the workspace root.\n" +
    "\n" +
    "You can read `workspace/review/files` for file-level guidance."
);

client.exposeSkill(
  "workspace/review/files",
  (query, headers) =>
    "# Workspace Review Files\n" +
    "\n" +
    `Topic: ${query.topic ?? "general"}\n` +
    "\n" +
    `Header: ${headers["x-review-scope"] ?? "none"}`
);
```

The current skill descriptor matches the protocol model:

- `name`
- optional `description`
- optional `contentType`
- optional `inputSchema`

Recommended resolver contract:

- `contentType` defaults to `text/markdown`
- `query` contains URL query parameters
- `headers` contains HTTP request headers when the skill is read through the server HTTP route
- the return value is the Markdown body itself

Skill path format is intentionally strict:

- slash-separated segments such as `workspace/review/files`
- lowercase `a-z`
- digits `0-9`
- `-` and `_`
- no empty segments, leading slash, trailing slash, `.`, `..`, spaces, `?`, or `#`

The SDK also allows `exposeSkill(name, markdown, options?)` as sugar for static skills.

## Recommended progressive-disclosure pattern

Use hierarchy in the skill name itself:

- `workspace/review`
- `workspace/review/files`
- `workspace/review/files/typescript`

Recommended authoring rules:

- make the root skill useful on its own
- point to deeper skill names in plain Markdown
- keep child skills narrower and more specific than the parent
- use resources for large raw payloads, not for the readable guidance itself

## Legacy handler form

The SDK still accepts the older `exposeSkill(name, handler, options?)` form for backward compatibility.
Prefer the resolver form for new skill documents.

## When to use a skill

Prefer a skill when:

- you want to publish reusable instructions or guidance
- you want progressive disclosure through deeper skill paths
- the content should be readable by a model directly as Markdown

Prefer a tool when the capability is a direct function call.

## How it is exposed to MCP

The server indexes skill metadata and exposes it through:

- `listSkills`
- `callSkills`
- `GET /skills/:clientId/*skillPath`
- `GET /:clientId/skills/*skillPath`

The underlying client invocation still routes through `callClient` with `kind: "skill"`.
For document-style skills, the HTTP routes return Markdown directly.

For the broader capability model, see [Capability Model](/protocol/capability-model).
For the protocol-level contract, see [Progressive Disclosure](/protocol/progressive-disclosure).
