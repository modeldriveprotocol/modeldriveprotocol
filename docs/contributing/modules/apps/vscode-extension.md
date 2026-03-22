---
title: VSCode Extension Guide
status: Draft
---

# VSCode Extension Guide

Use this guide when you are developing the app under `apps/vscode-extension`.

## Build and validate

Start with the app-scoped commands:

```bash
pnpm --filter @modeldriveprotocol/vscode-extension typecheck
pnpm --filter @modeldriveprotocol/vscode-extension test
pnpm --filter @modeldriveprotocol/vscode-extension build
```

## Start the extension in development

Open the repository root in VSCode and launch `MDP VSCode Extension`.

That launch configuration already exists in:

- `.vscode/launch.json`
- `.vscode/tasks.json`

The prelaunch task builds the extension before starting the Extension Development Host.

## Rebuild-on-save workflow

If you want rebuild-on-save while the Extension Development Host is running, use:

```bash
pnpm --filter @modeldriveprotocol/vscode-extension dev
```

That script runs the esbuild watcher for `apps/vscode-extension`.

## Configure against a local server

The extension defaults to:

```text
ws://127.0.0.1:47372
```

You can override it with the `mdp.serverUrl` setting inside the Extension Development Host.

## Debugging workflow

- use the Extension Development Host for extension-host behavior
- set breakpoints against `apps/vscode-extension/dist/**/*.js`
- use the status and command surface exposed by the extension to verify connection state

When publishing-related packaging is relevant, also validate:

```bash
pnpm --filter @modeldriveprotocol/vscode-extension package:vsix
```
