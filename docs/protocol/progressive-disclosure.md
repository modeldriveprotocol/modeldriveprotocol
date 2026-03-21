---
title: Progressive Disclosure
status: Draft
---

# Progressive Disclosure

Progressive disclosure in MDP should be modeled as a hierarchy of skill documents instead of a stateful skill session.

The design goal is simple:

- let the client publish a short root skill first
- let the host read deeper skill paths only when needed
- avoid dumping the full instruction set into one capability definition

## Definition model

The recommended JS SDK shape is:

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

The progressive-disclosure unit is the skill name itself:

- `workspace/review` is the summary node
- `workspace/review/files` is a deeper node
- `workspace/review/files/typescript` can go even deeper if needed

## Discovery and reading

The server still only needs the existing bridge surface:

- `listSkills` to discover available skill names
- `callSkills` to read one exact skill node
- `GET /skills/:clientId/*skillPath` to read one exact skill node over HTTP
- `GET /:clientId/skills/*skillPath` as an alternate HTTP shape

The HTTP routes pass URL query parameters and request headers to the skill resolver.

## Server behavior

The server stays intentionally simple:

- it indexes skill names and descriptions
- it forwards `callSkills` to the target client unchanged
- it does not need to understand skill hierarchy beyond the name string

This keeps progressive disclosure as a naming and authoring convention instead of a protocol state machine.

## Design rules

- Make the root skill useful on its own.
- Use path-like names to express depth.
- Let parent skills point to child skills in plain Markdown.
- Keep each skill focused enough that a host can choose whether to read it.
- Use resources for large raw payloads; use skills for readable instructions and guidance.
