---
title: Release NPM Packages
status: Draft
---

# Release NPM Packages

Use this path when published `@modeldriveprotocol/*` packages should ship to npm.

## Operator steps

1. Prepare the package changes with `pnpm changeset`.
2. Merge the changes into `main`.
3. Run `pnpm version-packages` on the release commit and commit the version bumps and changelog updates.
4. Create and push a tag like `v0.1.1`.
5. GitHub Actions runs `.github/workflows/release.yml`.

## What the workflow does

- checks out the tagged commit
- installs dependencies
- runs `pnpm build`
- runs `pnpm test`
- runs `pnpm publish:packages`

## Required repository setup

- secret `NPM_TOKEN`

## Local validation before tagging

```bash
pnpm build
pnpm test
```
