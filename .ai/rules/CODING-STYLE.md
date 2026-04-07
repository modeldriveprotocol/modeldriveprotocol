# Coding Style

Use this note when reorganizing source files, choosing import paths, or deciding whether code should stay local to one feature or move into a shared module.

## Goal

Keep source organization readable and predictable:

- imports should show dependency boundaries clearly
- shared code should move only when a real second consumer exists
- feature-private implementation should stay near its owning feature
- naming should make execution context and responsibility obvious

## Import Rules

Group imports by source, with one blank line between groups:

1. side-effect imports
2. Node built-ins with the `node:` prefix
3. third-party packages
4. workspace packages
5. package-local absolute imports such as `#~/...`
6. relative imports

Within a group:

- keep value imports and type imports adjacent
- prefer stable, readable ordering instead of mixing unrelated sources together
- do not insert `import type` lines into a different group just because they are type-only

## Path Rules

- use `#~/...` for package-internal absolute imports when the target is outside the current folder subtree
- use relative imports for the current directory or direct child modules
- do not stack long `../../..` paths across feature boundaries when a package-local absolute path is available
- do not create deep re-export chains only to shorten one import

## Naming Rules

- React components use PascalCase file names and exports
- hooks, helpers, state modules, and non-component files use kebab-case
- helper file names should describe one job, not generic buckets like `misc` or `utils` unless that folder is already the local utility boundary
- keep execution-context names visible in module names when that boundary matters, for example `background`, `page`, `ui`, `shared`

## Placement Rules

- if code is only used by one feature, keep it inside that feature directory first
- only move code to a wider shared location after a real second consumer appears
- prefer sibling feature folders and nearby helper modules over dumping new code into a global shared bucket
- when splitting a large file, keep the current public entry file and extract focused helpers next to it

## Shared Code Rules

Before copying code between two feature modules:

1. identify the smallest reusable part
2. extract only that part
3. keep it in the narrowest shared location that serves both consumers

Avoid moving feature-specific state, wording, or view structure into shared modules just because two files look similar.
