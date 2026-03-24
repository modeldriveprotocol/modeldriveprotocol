---
title: Node.js
status: Draft
---

# Node.js

Use this page when you need the concrete Node.js development setup for this repository.

## What this environment is used for

The current repository is built around a Node.js workspace. This environment is used by:

- `packages/protocol`
- `packages/client`
- `packages/server`
- `apps/browser-simple-mdp-client`
- `apps/chrome-extension`
- `apps/vscode-extension`
- `docs`
- `scripts`

## Prepare Node.js

Use Node.js 20 or newer for local development. This repository builds Node-targeted output and depends on packages in the lockfile that require modern Node.js versions.

The simplest setup flow is:

1. install Node.js
2. enable `corepack`
3. verify `node` and `pnpm`
4. install workspace dependencies

Example:

```bash
node -v
corepack enable
pnpm -v
```

## Install dependencies

Use the repo root as your working directory, then install dependencies once:

```bash
pnpm install
```

The repo declares `pnpm@10.28.0` in `packageManager`, so prefer the `corepack`-managed pnpm version rather than mixing package managers.

## Common root commands

```bash
pnpm test:unit
pnpm build
pnpm test
pnpm docs:dev
pnpm docs:build
```

- `pnpm build` runs recursive workspace builds across `packages/**` and `apps/**`.
- `pnpm test` reruns package builds before the smoke test so the dist-based end-to-end check uses fresh artifacts.
- `pnpm docs:dev` and `pnpm docs:build` automatically build the browser bundles they copy into `docs/public/assets`.

Additional root helpers:

```bash
pnpm build:packages
pnpm build:apps
pnpm typecheck
pnpm typecheck:packages
pnpm typecheck:apps
```

## App-scoped validation

When you are only touching one app, start with its own commands:

```bash
pnpm --filter @modeldriveprotocol/browser-simple-mdp-client test
pnpm --filter @modeldriveprotocol/browser-simple-mdp-client build

pnpm --filter @modeldriveprotocol/chrome-extension typecheck
pnpm --filter @modeldriveprotocol/chrome-extension test
pnpm --filter @modeldriveprotocol/chrome-extension build

pnpm --filter @modeldriveprotocol/vscode-extension typecheck
pnpm --filter @modeldriveprotocol/vscode-extension test
pnpm --filter @modeldriveprotocol/vscode-extension build
```

## Related pages

- [Protocol](/contributing/modules/protocol)
- [Server](/contributing/modules/server)
- [JavaScript SDK](/contributing/modules/sdks/javascript)
- [Chrome Extension](/contributing/modules/apps/chrome-extension)
- [VSCode Extension](/contributing/modules/apps/vscode-extension)
