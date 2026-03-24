# Architecture

Use this note when you are new to the Chrome extension app or need architecture, boundaries, WXT constraints, or change strategy.

## Purpose

This app runs an MDP client inside a Chrome Manifest V3 extension and exposes two capability surfaces:

- extension-side browser capabilities such as tabs, notifications, and config
- page-side automation capabilities through the content script and main-world bridge
- WXT owns the extension entrypoints, manifest generation, dev runner, and packaging flow

Do not treat `entrypoints/**`, `src/background/index.ts`, or any single capability file as a catch-all. This app should stay split by execution context and by capability family.

## Read This App In This Order

1. [README.md](../README.md)
2. [package.json](../package.json)
3. [wxt.config.ts](../wxt.config.ts)
4. [entrypoints/background.ts](../entrypoints/background.ts)
5. [entrypoints/content-script.ts](../entrypoints/content-script.ts)
6. [entrypoints/injected-main.ts](../entrypoints/injected-main.ts)
7. [entrypoints/sidepanel/index.html](../entrypoints/sidepanel/index.html)
8. [entrypoints/options/index.html](../entrypoints/options/index.html)
9. [src/background/index.ts](../src/background/index.ts)
10. [src/background/runtime.ts](../src/background/runtime.ts)
11. [src/background/capabilities/index.ts](../src/background/capabilities/index.ts)
12. [src/background/capabilities/extension.ts](../src/background/capabilities/extension.ts)
13. [src/background/capabilities/page.ts](../src/background/capabilities/page.ts)
14. [src/background/capabilities/resources.ts](../src/background/capabilities/resources.ts)
15. [src/background/shared.ts](../src/background/shared.ts)
16. [src/page/content-script.ts](../src/page/content-script.ts)
17. [src/page/injected-main.ts](../src/page/injected-main.ts)
18. [src/ui/sidepanel-app.tsx](../src/ui/sidepanel-app.tsx)
19. [src/ui/options-app.tsx](../src/ui/options-app.tsx)
20. [src/shared/config.ts](../src/shared/config.ts)
21. [test/page-visibility.test.ts](../test/page-visibility.test.ts)
22. [test/config.test.ts](../test/config.test.ts)

## Module Boundaries

Keep these boundaries intact:

- `wxt.config.ts`
  WXT config, manifest shape, output layout, and dev-runner behavior only
- `entrypoints/**`
  WXT entrypoint declarations and HTML shells only
- `src/background/index.ts`
  background startup wiring only; export reusable startup helpers for WXT entrypoints
- `src/background/runtime.ts`
  connection lifecycle, permission checks, tab injection state, and sidepanel/options message handling
- `src/background/capabilities/index.ts`
  top-level assembly of capability groups only
- `src/background/capabilities/extension.ts`
  extension-oriented tool registration only
- `src/background/capabilities/page.ts`
  page automation and bridge tool registration only
- `src/background/capabilities/resources.ts`
  resource registration only
- `src/background/shared.ts`
  shared background types, schema builders, and small reusable helpers
- `src/page/content-script.ts`
  DOM command dispatch and page-context wait/action implementations
- `src/page/injected-main.ts`
  main-world bridge and injected tool registry
- `src/ui/sidepanel-app.tsx`
  current-page sidepanel shell only
- `src/ui/options-app.tsx`
  React settings and workspace management surface only
- `src/page/visibility.ts`
  reusable visibility heuristics that should stay testable outside the content script

Directory intent:

- `src/background/**`
  background worker runtime, capability assembly, and Chrome-side lifecycle
- `entrypoints/**`
  WXT-owned extension entrypoints for background, content script, injected script, sidepanel, and options
- `src/page/**`
  content script, injected main-world bridge, and page-local message contracts
- `src/shared/**`
  config, storage, and cross-context utilities
- `src/ui/**`
  sidepanel/options scripts, shared UI helpers, and UI assets consumed by the WXT HTML entrypoints

Current UI layout:

- `src/ui/options-app.tsx`
  stable options entry module
- `src/ui/options/**`
  options-specific shell, routing, sections, and editor helpers
- `src/ui/sidepanel-app.tsx`
  stable sidepanel entry module
- `src/ui/sidepanel/**`
  sidepanel-specific controller, panels, and render helpers
- `src/ui/i18n.tsx`
  stable i18n provider entry
- `src/ui/i18n/**`
  locale dictionaries and locale types
- `src/ui/workspace-bundle-schema.ts`
  stable schema entry
- `src/ui/workspace-bundle-schema/**`
  schema definition fragments

Do not recreate `src/ui/react/**`; that wrapper layer has been intentionally removed.

If you add a new capability, put it in the nearest focused module. If a file starts mixing runtime lifecycle with registration or UI rendering with storage logic, split it before adding more branches.

## WXT Constraints

Keep the current WXT integration model intact:

- manifest configuration lives in `wxt.config.ts`; do not reintroduce a checked-in `src/manifest.json`
- local browser overrides belong in ignored `web-ext.config.ts`; shared app behavior must not depend on that file
- app entrypoint changes belong in `entrypoints/**`; reusable runtime logic belongs in `src/**`
- do not reintroduce the deleted custom build pipeline or app-local bundler scripts unless the app is explicitly leaving WXT
- `dev:manual` produces `dist/chrome-mv3-dev`, while `build` produces `dist/chrome-mv3`

## Change Strategy

When editing this app:

1. preserve existing capability names and payload shapes unless the feature explicitly requires a protocol change
2. change `entrypoints/**` only when the extension entry wiring or page shells need to change
3. add helpers to focused `src/**` modules before extending a large file with unrelated branches
4. keep content-script logic reusable and testable when possible
5. update app tests when page matching, visibility, or capability behavior changes
6. update `README.md` and docs when new tools, resources, or local workflows are introduced
