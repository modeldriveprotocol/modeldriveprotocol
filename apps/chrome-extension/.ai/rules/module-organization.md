# Module Organization

Use this note when splitting Chrome extension UI modules, extracting shared asset-editor logic, or deciding where code inside `apps/chrome-extension/src/ui/**` should live.

## Goal

Keep Chrome extension UI modules easy to navigate:

- stable entry files stay small and readable
- feature-private logic stays inside the owning feature folder
- shared asset-editor behavior is extracted once instead of copied between page and background flows
- files stay below roughly 300 lines unless they are intentionally thin composition roots

## Default Shape

For a feature surface, prefer:

- `foo.tsx` or `foo.ts` as the stable public entry
- `foo/**` as the sibling folder for extracted helpers, hooks, subcomponents, and local types

Examples:

- `background-client-editor.tsx` plus `background-client-editor/*`
- `client-assets-panel.tsx` plus `client-assets-panel/*`
- `scripted-asset-shared.tsx` plus `scripted-asset-shared/*`

## What Stays In The Entry File

Keep the entry file focused on:

- public props
- high-level composition
- wiring together nearby submodules

Move out:

- long state/effect orchestration
- context-menu builders and action factories
- reusable subpanels
- tree rendering helpers
- editor chrome details

## Local Folder Rules

Inside one feature folder, organize by responsibility rather than by vague buckets:

- `*-panel.tsx`, `*-tab.tsx`, `*-section.tsx` for focused UI slices
- `use-*.ts` for local hooks
- `*-helpers.ts` for pure feature-local helpers
- `types.ts` for local contracts

Only create deeper nested folders when one extracted area has multiple files of its own.

## Shared Asset Workspace Rule

For page and background asset editing:

- shared layout belongs in `scripted-asset-workspace/*`
- shared editor chrome belongs in `scripted-asset-shared/*`
- shared tree primitives belong in `asset-tree-shared/*`
- page/background modules should only keep feature-specific orchestration and runtime-specific mutations

Do not let page and background drift into separate copies of the same tree or editor behavior.

## Split Triggers

Split a file when it starts combining more than one of these:

- React rendering plus long mutation logic
- route synchronization plus local tree state
- editor chrome plus control widgets plus menu rendering
- tree rendering plus scope-panel rendering plus rename widgets

If a file is above 300 lines, treat that as a refactor prompt, not a target to justify.

## Validation Rule

A module split is only complete when:

- the entry path stays stable
- imports remain readable
- related page/background flows still share behavior where expected
- tests, build, and real-browser validation still pass for the touched surface
