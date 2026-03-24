---
title: Release NPM Packages
status: Draft
---

# Release NPM Packages

Use this path when published `@modeldriveprotocol/*` packages should ship to npm.

That includes the protocol, client, and server packages under `packages/*`, and publishable npm-delivered app packages such as `@modeldriveprotocol/browser-simple-mdp-client`.

## Operator steps

1. Prepare the package changes with `pnpm changeset`.
2. Merge the changes into `main`.
3. Run `pnpm version-packages` on the release commit and commit the version bumps and changelog updates.
4. Create and push a tag like `v1.0.0`.
5. GitHub Actions runs `.github/workflows/release.yml`.

## What the workflow does

- checks out the tagged commit
- validates the tag against the package versions being released
- installs dependencies
- runs `pnpm build` across workspace packages and apps
- runs `pnpm test`, which reruns package builds before the smoke test
- runs `pnpm publish:packages`
- creates or updates the matching GitHub Release

Because the root build and test commands include `@modeldriveprotocol/browser-simple-mdp-client`, the same release workflow now verifies and publishes that package together with the core packages when its version changes.

## Required repository setup

- secret `NPM_TOKEN` with publish access to the `@modeldriveprotocol` npm scope

## Local validation before tagging

```bash
pnpm build
pnpm test
```
