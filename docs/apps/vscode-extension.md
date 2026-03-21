---
title: VSCode Extension
status: Draft
---

# VSCode Extension

VSCode is a good MDP host runtime when the capability depends on workspace state, editor selection, diagnostics, or extension-owned commands.

## Good capability shapes

Typical examples include:

- reading the active file or selection as a resource
- exposing extension commands as tools
- packaging review or refactor flows as skills

## Recommended topology

Run the MDP client inside the extension host process and expose capabilities from the extension boundary, not from a separate remote service.

That keeps:

- editor state local
- capability metadata explicit
- MCP integration stable through the MDP server

## Current repo status

This repository now includes a dedicated VSCode extension app under `apps/vscode-extension`.

The app runs the MDP client inside the extension host and currently exposes:

- `vscode.getWorkspaceContext`
- `vscode.findWorkspaceFiles`
- `vscode.readWorkspaceFile`
- `vscode.searchWorkspaceText`
- `vscode.getDiagnostics`
- `vscode.executeCommand` with an allowlist
- `vscode.reviewSelection` as a prompt
- `vscode/review-active-editor` as a skill
- active document, selection, and workspace folder resources

Use it as the default starting point when you want a VSCode runtime to register capabilities with the MDP server.

## Configuration

The extension contributes `mdp.*` settings for the main integration points:

- `mdp.serverUrl`
- `mdp.autoConnect`
- `mdp.autoReconnect`
- `mdp.reconnectDelayMs`
- `mdp.clientId`
- `mdp.clientName`
- `mdp.authToken`
- `mdp.allowedCommands`
- `mdp.findFilesMaxResults`
- `mdp.textSearchMaxResults`
- `mdp.resourceTextLimit`
- `mdp.diagnosticResultLimit`

## Build

Build the extension with:

```bash
pnpm --filter @modeldriveprotocol/vscode-extension build
```

The extension entry point is emitted to `apps/vscode-extension/dist/extension.js`.

## Local debug

When developing this repository in VSCode, open the repo root and use the checked-in `MDP VSCode Extension` launch configuration.

If you want rebuild-on-save while the Extension Development Host is running, start:

```bash
pnpm --filter @modeldriveprotocol/vscode-extension dev
```

## Release

The repository includes dedicated VSCode extension workflows:

- `.github/workflows/vscode-extension-ci.yml` validates the app and uploads a VSIX artifact
- `.github/workflows/vscode-extension-release.yml` runs on `vscode-extension-v*` tags, packages the VSIX, publishes to the VS Code Marketplace, and attaches the artifact to a GitHub release

The release workflow expects:

- repository variable `VSCODE_EXTENSION_PUBLISHER`
- secret `VSCE_PAT`

- [JavaScript Quick Start](/sdk/javascript/quick-start)
- [MCP Definitions](/sdk/javascript/mcp-definitions)
- [Skills Definitions](/sdk/javascript/skills-definitions)
