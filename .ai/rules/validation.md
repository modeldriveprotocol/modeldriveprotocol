# Validation

Use this note when you need to decide which repo-level checks to run and what each command proves.

## Generated Files

Do not hand-edit generated outputs unless you are explicitly debugging generated output.

Generated or build-derived paths include:

- `packages/*/dist/**`
- `packages/*/*.tsbuildinfo`
- `docs/.vitepress/dist/**`
- `docs/public/assets/modeldriveprotocol-client.global.js`
- `docs/public/assets/modeldriveprotocol-client.global.js.map`

If you need to change behavior, edit `src/**` or scripts, then rebuild.

## Test Layout

Vitest is configured at the repo root in:

- [vitest.config.ts](../../vitest.config.ts)

Package-level unit tests live in:

- `packages/protocol/test/**`
- `packages/client/test/**`
- `packages/server/test/**`
- `apps/*/test/**`

Use unit tests for behavior that should stay stable within one layer:

- protocol parsing and guard semantics
- client registry and invocation behavior
- server indexing, routing, and lifecycle behavior

Use the smoke test for the full chain:

- client build output
- server startup
- MCP bridge reachability
- end-to-end invocation

Repo-level smoke coverage is still not a substitute for host-native verification in apps like the Chrome extension.
When the user asks for real end-to-end proof inside the host runtime, follow the app-specific validation guide after the repo checks and keep evidence plus cleanup steps explicit.

## How To Validate Changes

Use these commands:

```bash
pnpm test:unit
pnpm build
pnpm test
pnpm docs:build
```

What they prove:

- `pnpm test:unit`
  runs Vitest unit coverage for protocol, client, and server packages
- `pnpm build`
  builds all workspace packages and apps from the repo root via pnpm recursive filters
- `pnpm test`
  runs unit tests first, then rebuilds package artifacts and runs the smoke test that exercises server startup, client registration, and MCP bridge calls
- `pnpm docs:build`
  builds the docs bundle prerequisites, prepares static docs assets, and builds the VitePress site

Useful narrower root helpers:

```bash
pnpm build:packages
pnpm build:apps
pnpm typecheck
pnpm typecheck:packages
pnpm typecheck:apps
```

If you are editing only one package, these narrower commands are available too:

```bash
pnpm --filter @modeldriveprotocol/protocol test
pnpm --filter @modeldriveprotocol/client test
pnpm --filter @modeldriveprotocol/server test
pnpm --filter @modeldriveprotocol/chrome-extension test
pnpm --filter @modeldriveprotocol/vscode-extension test
```

## When Root Checks Are Not Enough

Escalate beyond repo-level checks when:

- the user explicitly asks for real browser, real editor, or other host-native proof
- the change depends on runtime lifecycle, persisted host state, or reconnect behavior
- visual confirmation is part of the acceptance criteria

In those cases:

- run the narrow app/package checks first
- follow the subproject's host-specific E2E guide
- capture concrete evidence such as screenshots, DOM text, or persisted state
- clean up temporary host data, local profiles, or disposable artifacts before handoff
