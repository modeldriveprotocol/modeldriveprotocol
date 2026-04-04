# Module Organization

Use this note when splitting large source files, deciding where extracted modules should live, or adding new modules that could make an existing file too large.

## Goal

Keep module boundaries easy to understand:

- one file should usually own one dominant responsibility
- execution context boundaries should stay visible
- helpers should live near the feature they support
- stable entry files should stay small enough to read quickly

This rule is repo-wide. Subprojects can add tighter local rules, but they should build on this note instead of replacing it.

## Default Rule

Do not let a single source file grow without bound.

As a default working threshold:

- start looking for splits once a file is around 300 lines
- treat files above roughly 500 lines as a smell unless they are intentionally acting as a narrow composition root

Line count is only a signal. Split earlier when a file mixes unrelated concerns.

## Split Triggers

Refactor a file when it starts combining more than one of these:

- public API surface plus private helper implementation
- runtime orchestration plus low-level helper logic
- data normalization plus UI rendering
- protocol/schema definitions plus business behavior
- multiple unrelated feature branches in one module
- route parsing, storage access, and rendering in the same file

## Preferred Shape

When splitting a module:

1. keep the current public entry file if callers already depend on it
2. extract focused helpers into a sibling directory or nearby files
3. name extracted files by concern, not by vague buckets like `utils`
4. keep cross-boundary helpers in the narrowest shared location that fits

Prefer:

- `foo.ts` or `foo.tsx` as the stable entry
- `foo/helpers.ts`, `foo/schema.ts`, `foo/view.tsx`, `foo/actions.ts`
- feature folders when one surface needs multiple helpers

## Boundary Rules

Organize modules by the boundary that matters most:

- execution context first
  - `background`, `page`, `ui`, `shared`, `server`, `client`, `protocol`
- feature boundary second
  - capability family, screen section, transport, schema family, config concern

Do not hide execution-context boundaries behind generic helper modules.

## Shared Code

Before copying behavior between two large files:

- extract the shared behavior into one focused helper or component
- keep it close to the consuming surface unless it is truly cross-project
- move only the reusable part, not the entire surrounding flow

Good shared modules are:

- narrow
- named after one job
- usable without dragging unrelated dependencies with them

## Anti-Patterns

Avoid:

- one giant file that mixes routing, persistence, validation, rendering, and side effects
- replacing a huge file with a huge `index.ts`
- moving unrelated helpers into `utils.ts`
- creating deep export passthrough chains that hide the real implementation
- extracting tiny files so aggressively that the feature becomes harder to follow

## Practical Test

A module organization change is probably healthy when:

- a new reader can tell where to edit within a few seconds
- each file answers one main question
- shared logic is reused instead of duplicated
- the entry file reads like composition, not a dumping ground
