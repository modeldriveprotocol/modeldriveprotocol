---
title: Skills Definitions
status: Draft
---

# Skills Definitions

Skills are workflow-shaped capabilities. They are useful when a runtime wants to expose a named operation that may combine multiple internal steps.

## Define a skill

Use `exposeSkill(name, handler, options?)`:

```ts
client.exposeSkill("pageReview", async ({ severity }) => ({
  severity: severity ?? "medium",
  findings: []
}), {
  description: "Run a page review workflow",
  inputSchema: {
    type: "object",
    properties: {
      severity: { type: "string" }
    }
  }
});
```

The current skill descriptor matches the protocol model:

- `name`
- optional `description`
- optional `inputSchema`

## When to use a skill

Prefer a skill when:

- the capability represents a workflow instead of a single read or action
- the name should carry semantic meaning at discovery time
- the runtime may combine several local steps behind one call

Prefer a tool when the capability is a direct function call.

## How it is exposed to MCP

The server indexes skill metadata and exposes it through:

- `listSkills`
- `callSkills`

The underlying client invocation still routes through `callClient` with `kind: "skill"`.

For the broader capability model, see [Capability Model](/protocol/capability-model).
