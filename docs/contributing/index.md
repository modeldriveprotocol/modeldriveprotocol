---
title: Contributing
status: Draft
---

# Contributing

This section is the entrypoint for people co-building the repository itself: protocol changes, runtime changes, docs updates, tests, release automation, and repository maintenance.

The structure is intentionally split into two tracks:

- how to contribute
- how to release

## Local workflow

Use repo-level commands from the project root:

```bash
pnpm install
pnpm test:unit
pnpm build
pnpm test
pnpm docs:build
```

These commands match the validation flow described in the root `AGENTS.md`.

- `pnpm build` runs the workspace build graph from the root instead of hard-coding per-package commands.
- `pnpm test` includes a fresh package rebuild before the smoke test.
- `pnpm docs:build` prepares the generated browser assets before invoking VitePress.

## How to use this section

- Start with [Project Architecture](/contributing/architecture) if you need to understand how changes should flow through the repository.
- Use the module guides to decide which directory owns the behavior you want to change.
- Use [Releasing](/contributing/releasing) only when you are preparing an actual published release.

## Common contributor workflow

For most changes:

1. read the root `AGENTS.md` and the nearest app or directory-specific `AGENTS.md`
2. make the smallest change in the correct layer
3. run the narrowest local validation that proves the behavior
4. update docs when you change protocol shape, workflow, or host behavior
5. add a changeset when the change affects a published `@modeldriveprotocol/*` package

## Related pages

- [Project Architecture](/contributing/architecture)
- [Environment Setup](/contributing/setup/)
- [Releasing](/contributing/releasing)
- [Release NPM packages](/contributing/releasing-packages)
- [Release apps](/contributing/releasing-apps)
