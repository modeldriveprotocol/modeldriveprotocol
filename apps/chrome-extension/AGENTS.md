# AGENTS.md

This file is for agents working on the Chrome extension app under `apps/chrome-extension`.

## Purpose

This app runs an MDP client inside a Chrome Manifest V3 extension and exposes two capability surfaces:

- extension-side browser capabilities such as tabs, notifications, and config
- page-side automation capabilities through the content script and main-world bridge

Do not treat `src/background/index.ts` or any single capability file as a catch-all. This app should stay split by execution context and by capability family.

## Read This App In This Order

1. [README.md](./README.md)
2. [src/background/index.ts](./src/background/index.ts)
3. [src/background/runtime.ts](./src/background/runtime.ts)
4. [src/background/capabilities/index.ts](./src/background/capabilities/index.ts)
5. [src/background/capabilities/extension.ts](./src/background/capabilities/extension.ts)
6. [src/background/capabilities/page.ts](./src/background/capabilities/page.ts)
7. [src/background/capabilities/resources.ts](./src/background/capabilities/resources.ts)
8. [src/background/shared.ts](./src/background/shared.ts)
9. [src/page/content-script.ts](./src/page/content-script.ts)
10. [src/page/injected-main.ts](./src/page/injected-main.ts)
11. [src/ui/popup.ts](./src/ui/popup.ts)
12. [src/ui/options.ts](./src/ui/options.ts)
13. [src/shared/config.ts](./src/shared/config.ts)
14. [test/page-visibility.test.ts](./test/page-visibility.test.ts)
15. [test/config.test.ts](./test/config.test.ts)

## Module Boundaries

Keep these boundaries intact:

- `src/background/index.ts`
  service worker entrypoint and Chrome event wiring only
- `src/background/runtime.ts`
  connection lifecycle, permission checks, tab injection state, popup message handling
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
- `src/ui/popup.ts`
  popup state rendering and button actions only
- `src/ui/options.ts`
  settings form and permission UI only
- `src/page/visibility.ts`
  reusable visibility heuristics that should stay testable outside the content script

Directory intent:

- `src/background/**`
  background worker runtime, capability assembly, and Chrome-side lifecycle
- `src/page/**`
  content script, injected main-world bridge, and page-local message contracts
- `src/shared/**`
  config, storage, and cross-context utilities
- `src/ui/**`
  popup/options scripts and static assets

If you add a new capability, put it in the nearest focused module. If a file starts mixing runtime lifecycle with registration or UI rendering with storage logic, split it before adding more branches.

## Change Strategy

When editing this app:

1. preserve existing capability names and payload shapes unless the feature explicitly requires a protocol change
2. add helpers to focused modules before extending a large file with unrelated branches
3. keep content-script logic reusable and testable when possible
4. update app tests when page matching, visibility, or capability behavior changes
5. update `README.md` and docs when new tools, resources, or local workflows are introduced

## Validation

Use the app-scoped commands first:

```bash
pnpm --filter @modeldriveprotocol/chrome-extension typecheck
pnpm --filter @modeldriveprotocol/chrome-extension test
pnpm --filter @modeldriveprotocol/chrome-extension build
```

When repo-level docs or integration points are touched, also run the broader repo validation that fits the change.

Remove generated `dist/**` artifacts from this app after validation if they are not part of the requested change.
