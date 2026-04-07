# Route Asset Model

Use this note when editing `asset-helpers.ts` or changing how route-client exposes are interpreted.

## Scope

This module owns route/page asset normalization:

- mapping route exposes into code files, markdown files, and folders
- method resolution and source extraction
- path utilities used by route asset editing

## Rules

- keep route-specific data rules here, not in the shared tree module
- preserve the current product rule that route and background assets share the same editing mental model even if their stored data differs
- root `SKILL.md` is mandatory:
  - create it by default for new clients
  - recreate it during import normalization if missing
  - do not allow deletion of the root client `SKILL.md`

## Boundary

If a helper no longer needs route-specific knowledge, move it to the shared asset workspace instead of growing this file family.
