# Source Layout

Use this note when splitting large Chrome extension source files, adding new modules, or deciding where code should live after a refactor.

## Goal

Keep app source file sizes bounded and organize code by execution context plus feature boundary.

For this app, prefer:

- stable public module files such as `foo.ts` or `foo.tsx` as the real entry point
- sibling folders such as `foo/**` for extracted helpers, hooks, sections, and subcomponents
- avoiding extra `index.ts` passthrough layers unless import stability truly requires one
- shared helpers extracted before adding another unrelated branch to a large file

## Directory Rules

### `src/ui/i18n/**`

Split by concern:

- provider and hooks in `index.tsx`
- locale types in `types.ts`
- message dictionaries in small topic files such as `common-messages.ts`, `sidepanel-messages.ts`, `options-shell-messages.ts`

Do not move storage access or locale detection into unrelated UI modules.

### `src/ui/options/**`

Split by surface:

- `options-app.tsx` for top-level shell and routing
- `components/**` for reusable UI atoms
- `sections/**` for workspace, settings, clients, market, and imports
- route parsing or section-local utilities in focused helpers, not mixed into component files

### `src/ui/sidepanel/**`

Split by surface and card type:

- `sidepanel-app.tsx` for top-level state orchestration
- helpers for status labels and sorting
- separate card/render modules for background and route clients when the list grows

### `src/shared/config/**`

Split pure config logic by concern:

- types and defaults
- builders and presets
- matching helpers
- normalization and migration helpers

Do not mix UI helpers or Chrome runtime calls into config modules.

### `src/background/runtime/**`

Split by runtime concern:

- lifecycle and client sync
- tab and permission helpers
- popup/options message handlers
- recording and selector-capture flows

Keep the entry file focused on the runtime class and composition.

### `src/page/content-script/**`

Split by page concern:

- command dispatch
- DOM actions and waits
- recording
- selector capture
- main-world bridge helpers

Keep module-level page state in a focused state module when multiple helpers need it.

### `src/background/capabilities/route/**`

Split route capability registration by tool family:

- page inspection and interaction tools
- injected bridge tools
- wait tools
- resource/skill exposure helpers

## File Size Rule

As a default working threshold, avoid keeping app source files above roughly 300 lines when they contain multiple unrelated concerns.

If a file crosses that threshold:

1. identify the dominant concerns inside it
2. extract focused helpers or subcomponents into a sibling directory
3. keep the original public module path as the real entry file and move only the helpers around it

## Anti-Patterns

Avoid:

- replacing one 900-line file with a 700-line `index.ts`
- adding one-line passthrough exports when the public entry file can own the real exports directly
- moving unrelated helpers into `utils.ts` without a feature boundary
- putting React rendering, route parsing, storage access, and business rules in one module
- importing from deep UI modules into background or shared runtime modules
