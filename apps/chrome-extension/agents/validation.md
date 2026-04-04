# Validation

Use this note when you need to decide which Chrome extension app checks to run and what each command proves.

## App-Scoped Commands

```bash
pnpm --filter @modeldriveprotocol/chrome-extension paths
pnpm --filter @modeldriveprotocol/chrome-extension dev
pnpm --filter @modeldriveprotocol/chrome-extension dev:manual
pnpm --filter @modeldriveprotocol/chrome-extension typecheck
pnpm --filter @modeldriveprotocol/chrome-extension test
pnpm --filter @modeldriveprotocol/chrome-extension build
pnpm --filter @modeldriveprotocol/chrome-extension zip
```

## What They Prove

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

## Scope Rule

When repo-level docs or integration points are touched, also run the broader repo validation that fits the change.

Remove generated `dist/**` artifacts from this app after validation if they are not part of the requested change.

## Escalate To Real E2E

The commands above are the default floor, not the ceiling.

After they pass, use [real-e2e.md](./real-e2e.md) when:

- the user asks for true end-to-end proof
- the change touches background runtime lifecycle or server connectivity
- the change touches persisted workspace config, route clients, or management paths
- the change depends on content-script injection, main-world bridge behavior, or visible options/popup state

For those tasks, keep both of these explicit in the final handoff:

- what was proven in a real browser plus real caller flow
- how temporary workspace data and `.artifacts/**` were cleaned up
