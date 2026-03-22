# AGENTS.md

This file is for agents working on the Node.js simple client app under `apps/nodejs-simple-mdp-client`.

## Purpose

This app runs an MDP client inside a local Node.js process and exposes a narrow workspace-oriented capability surface:

- Node.js runtime and root package inspection
- workspace subpackage discovery
- package manifest read/write operations
- filesystem-backed skill content

Keep this app intentionally small. It is a reference client for local Node.js environments, not a second server runtime and not a generic repository automation layer.

## Read This App In This Order

1. [package.json](./package.json)
2. [src/index.ts](./src/index.ts)
3. [src/cli.ts](./src/cli.ts)
4. [skills/overview.md](./skills/overview.md)
5. [skills/tools.md](./skills/tools.md)
6. [skills/package-json.md](./skills/package-json.md)
7. [test/nodejs-simple-mdp-client.test.ts](./test/nodejs-simple-mdp-client.test.ts)

## Module Boundaries

Keep these boundaries intact:

- `src/index.ts`
  capability registration, workspace/package helpers, and file-backed skill resolvers
- `src/cli.ts`
  CLI argument parsing, client boot, and process lifecycle only
- `skills/*.md`
  human-facing skill content only; do not hardcode those markdown bodies into TypeScript unless the filesystem dependency is intentionally being removed
- `test/nodejs-simple-mdp-client.test.ts`
  workspace fixture setup and behavior coverage for the exposed tools and skills

If the app grows past these responsibilities, split helper modules by concern instead of turning `src/index.ts` into a catch-all file.

## Change Strategy

When editing this app:

1. preserve existing tool names and response shapes unless a protocol-facing change is required
2. keep workspace file access scoped to the resolved workspace root
3. treat `package.json` edits as structured updates; do not replace unrelated manifest fields
4. keep skill content in `skills/*.md` and expose it through filesystem reads
5. extend tests whenever a tool input schema, manifest update rule, or workspace discovery rule changes

## Validation

Use the app-scoped commands first:

```bash
pnpm --filter @modeldriveprotocol/nodejs-simple-mdp-client test
pnpm --filter @modeldriveprotocol/nodejs-simple-mdp-client build
pnpm exec tsc -p apps/nodejs-simple-mdp-client/tsconfig.json --pretty false
```

When the app is wired into repo-level workflows, also run the broader repo validation that matches the touched integration points.

Remove generated `dist/**` artifacts from this app after validation if they are not part of the requested change.
