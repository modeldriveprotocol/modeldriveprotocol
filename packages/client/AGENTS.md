# AGENTS.md

This file is for agents working on `packages/client`.

## Purpose

This package is the JavaScript MDP client SDK.

It is responsible for:

- client registration and capability exposure
- routed invocation handling
- browser bootstrap helpers
- transport adapters for websocket and HTTP loop mode

It is not responsible for:

- server-side routing policy
- protocol schema ownership
- app-specific capability implementations

## Read This Package In This Order

1. [package.json](./package.json)
2. [src/index.ts](./src/index.ts)
3. [src/types.ts](./src/types.ts)
4. [src/mdp-client.ts](./src/mdp-client.ts)
5. [src/runtime/procedure-registry.ts](./src/runtime/procedure-registry.ts)
6. [src/runtime/reconnect-controller.ts](./src/runtime/reconnect-controller.ts)
7. [src/transport/client-connection.ts](./src/transport/client-connection.ts)
8. [src/transport/ws-client.ts](./src/transport/ws-client.ts)
9. [src/transport/http-loop-client.ts](./src/transport/http-loop-client.ts)
10. [src/transport/transport-auth.ts](./src/transport/transport-auth.ts)
11. [src/browser/browser-entry.ts](./src/browser/browser-entry.ts)
12. [src/browser/global.ts](./src/browser/global.ts)
13. [test/mdp-client.test.ts](./test/mdp-client.test.ts)
14. [test/browser-entry.test.ts](./test/browser-entry.test.ts)
15. [test/procedure-registry.test.ts](./test/procedure-registry.test.ts)

## Source Layout

Keep `src/` split by responsibility:

- `src/index.ts`, `src/types.ts`, `src/mdp-client.ts`
  public SDK surface and stable entry points
- `src/runtime/**`
  client runtime internals such as capability registry and reconnect control
- `src/transport/**`
  transport implementations, transport selection, and transport auth bootstrap
- `src/browser/**`
  browser-facing entry points and global bundle glue

Root-level files like `src/browser-entry.ts`, `src/global.ts`, `src/http-loop-client.ts`, `src/procedure-registry.ts`, and `src/ws-client.ts` are compatibility shims. Keep them thin and re-export-only unless the public entry surface itself changes.

## Change Strategy

When editing this package:

1. keep public entry points stable unless a package API change is explicitly required
2. put browser-only logic in `src/browser/**`, not in transport or runtime modules
3. put reconnect and lifecycle coordination in `src/runtime/**`, not in transport adapters
4. keep transport adapters focused on wire/session behavior; do not let them accumulate registry logic
5. update focused tests whenever client lifecycle, browser bootstrap, or transport behavior changes

## Validation

Use package-scoped validation first:

```bash
pnpm exec tsc -p packages/client/tsconfig.json --pretty false
pnpm exec vitest run packages/client/test/mdp-client.test.ts
pnpm exec vitest run packages/client/test/browser-entry.test.ts
pnpm exec vitest run packages/client/test/procedure-registry.test.ts
```

If your change also touches dependent apps, run the matching app tests too.
