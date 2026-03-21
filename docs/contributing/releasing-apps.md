---
title: Release Apps
status: Draft
---

# Release Apps

Use this path when you want to publish application artifacts rather than npm packages.

This repository currently ships two app release types:

- Chrome extension zip
- VSCode extension VSIX

## Chrome extension

Use this path when you want a packaged Chrome extension zip attached to a GitHub release.

### Operator steps

1. Update the version in `apps/chrome-extension/src/manifest.json`.
2. Keep `apps/chrome-extension/package.json` on the same version.
3. Create and push a tag like `chrome-extension-v0.1.0`.
4. GitHub Actions runs `.github/workflows/chrome-extension-release.yml`.

### What the workflow checks

- the tag version matches `manifest.json`
- the tag version matches `package.json`

### What the workflow does

- typechecks and tests the extension
- builds shared workspace package dependencies needed for bundling
- builds the Chrome extension
- packages `apps/chrome-extension/dist` into a zip
- uploads the packaged artifact inside the workflow
- creates or updates a GitHub release for the tag and attaches the zip

## VSCode extension

Use this path when you want to publish a VSIX to the VS Code Marketplace and also attach it to a GitHub release.

### Operator steps

1. Update `apps/vscode-extension/package.json` to the release version.
2. Create and push a tag like `vscode-extension-v0.1.0`.
3. GitHub Actions runs `.github/workflows/vscode-extension-release.yml`.

### What the workflow checks

- the tag version matches `apps/vscode-extension/package.json`
- repository variable `VSCODE_EXTENSION_PUBLISHER` is present

### What the workflow does

- typechecks and tests the extension
- builds shared workspace package dependencies needed for bundling
- builds the VSCode extension
- packages a `.vsix`
- uploads the `.vsix` as a workflow artifact
- publishes the `.vsix` to the VS Code Marketplace
- creates or updates a GitHub release for the tag and attaches the `.vsix`

## Required repository setup

- repository variable `VSCODE_EXTENSION_PUBLISHER`
- secret `VSCE_PAT`

## Local validation before tagging

```bash
pnpm --filter @modeldriveprotocol/chrome-extension typecheck
pnpm --filter @modeldriveprotocol/chrome-extension test
pnpm --filter @modeldriveprotocol/protocol build
pnpm --filter @modeldriveprotocol/client build
pnpm --filter @modeldriveprotocol/chrome-extension build

pnpm --filter @modeldriveprotocol/vscode-extension typecheck
pnpm --filter @modeldriveprotocol/vscode-extension test
pnpm --filter @modeldriveprotocol/protocol build
pnpm --filter @modeldriveprotocol/client build
pnpm --filter @modeldriveprotocol/vscode-extension build
```
