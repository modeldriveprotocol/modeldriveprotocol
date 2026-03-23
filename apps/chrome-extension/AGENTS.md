# AGENTS.md

This file is for agents working on the Chrome extension app under `apps/chrome-extension`.

## Purpose

This app runs an MDP client inside a Chrome Manifest V3 extension and exposes two capability surfaces:

- extension-side browser capabilities such as tabs, notifications, and config
- page-side automation capabilities through the content script and main-world bridge
- WXT owns the extension entrypoints, manifest generation, dev runner, and packaging flow

Do not treat `entrypoints/**`, `src/background/index.ts`, or any single capability file as a catch-all. This app should stay split by execution context and by capability family.

## Read This App In This Order

1. [README.md](./README.md)
2. [package.json](./package.json)
3. [wxt.config.ts](./wxt.config.ts)
4. [entrypoints/background.ts](./entrypoints/background.ts)
5. [entrypoints/content-script.ts](./entrypoints/content-script.ts)
6. [entrypoints/injected-main.ts](./entrypoints/injected-main.ts)
7. [entrypoints/popup/index.html](./entrypoints/popup/index.html)
8. [entrypoints/options/index.html](./entrypoints/options/index.html)
9. [src/background/index.ts](./src/background/index.ts)
10. [src/background/runtime.ts](./src/background/runtime.ts)
11. [src/background/capabilities/index.ts](./src/background/capabilities/index.ts)
12. [src/background/capabilities/extension.ts](./src/background/capabilities/extension.ts)
13. [src/background/capabilities/page.ts](./src/background/capabilities/page.ts)
14. [src/background/capabilities/resources.ts](./src/background/capabilities/resources.ts)
15. [src/background/shared.ts](./src/background/shared.ts)
16. [src/page/content-script.ts](./src/page/content-script.ts)
17. [src/page/injected-main.ts](./src/page/injected-main.ts)
18. [src/ui/popup.ts](./src/ui/popup.ts)
19. [src/ui/options.ts](./src/ui/options.ts)
20. [src/shared/config.ts](./src/shared/config.ts)
21. [test/page-visibility.test.ts](./test/page-visibility.test.ts)
22. [test/config.test.ts](./test/config.test.ts)

## Module Boundaries

Keep these boundaries intact:

- `wxt.config.ts`
  WXT config, manifest shape, output layout, and dev-runner behavior only
- `entrypoints/**`
  WXT entrypoint declarations and HTML shells only
- `src/background/index.ts`
  background startup wiring only; export reusable startup helpers for WXT entrypoints
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
- `entrypoints/**`
  WXT-owned extension entrypoints for background, content script, injected script, popup, and options
- `src/page/**`
  content script, injected main-world bridge, and page-local message contracts
- `src/shared/**`
  config, storage, and cross-context utilities
- `src/ui/**`
  popup/options scripts and UI assets consumed by the WXT HTML entrypoints

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

## Validation

Use the app-scoped commands first:

```bash
pnpm --filter @modeldriveprotocol/chrome-extension paths
pnpm --filter @modeldriveprotocol/chrome-extension dev
pnpm --filter @modeldriveprotocol/chrome-extension dev:manual
pnpm --filter @modeldriveprotocol/chrome-extension typecheck
pnpm --filter @modeldriveprotocol/chrome-extension test
pnpm --filter @modeldriveprotocol/chrome-extension build
pnpm --filter @modeldriveprotocol/chrome-extension zip
```

What they prove:

- `paths`
  prints the absolute manual-load build path, production-style build path, and persistent WXT Chrome profile path
- `dev`
  starts WXT dev mode with its managed Chrome runner and persistent profile under `.wxt/chrome-data`
- `dev:manual`
  runs WXT in watch mode without auto-launching Chrome and produces a manually loadable unpacked extension in `dist/chrome-mv3-dev`
- `typecheck`
  validates the app against generated WXT types plus the workspace TypeScript sources
- `test`
  runs the app's Vitest coverage
- `build`
  produces the production-style unpacked extension in `dist/chrome-mv3`
- `zip`
  packages the extension for distribution from the WXT build output

When repo-level docs or integration points are touched, also run the broader repo validation that fits the change.

Remove generated `dist/**` artifacts from this app after validation if they are not part of the requested change.

## Local Debug Notes

When you need to quickly show the extension UI in a local macOS session, this flow is known to work:

```bash
pnpm --filter @modeldriveprotocol/chrome-extension paths
mkdir -p apps/chrome-extension/.wxt/chrome-data
pnpm --filter @modeldriveprotocol/chrome-extension dev
```

Notes from the March 23, 2026 debug session:

- `paths` confirms the two unpacked build directories and the persistent WXT Chromium profile under `apps/chrome-extension/.wxt/chrome-data`.
- `dev` successfully builds the unpacked development extension into `apps/chrome-extension/dist/chrome-mv3-dev` before attempting to launch the browser.
- On this machine, WXT launches `Google Chrome Canary` with `--user-data-dir=/Users/bytedance/projects/mdp/apps/chrome-extension/.wxt/chrome-data`.
- If `dev` fails with `ENOENT ... chrome-out.log`, the immediate fix is to create `apps/chrome-extension/.wxt/chrome-data` first and rerun `dev`.
- After launch, the extension id can be read from `apps/chrome-extension/.wxt/chrome-data/Default/Secure Preferences` by locating the extension whose `path` ends with `/apps/chrome-extension/dist/chrome-mv3-dev`.
- During the recorded session, that generated id was `jigghlocdbpecagpponmdkfmnhhiobfo`. Treat it as profile-local debug state, not as a stable id to hardcode.
- Once the browser is up, opening `chrome-extension://<extension-id>/popup.html` and `chrome-extension://<extension-id>/options.html` is a reliable way to bring the UI to the foreground for a quick visual check.
