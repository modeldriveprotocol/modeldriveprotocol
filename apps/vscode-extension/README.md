# VSCode Extension

This app runs an MDP client inside the VSCode extension host and exposes editor and workspace capabilities through the existing bridge server.

## What it exposes

- `vscode.getWorkspaceContext`
- `vscode.findWorkspaceFiles`
- `vscode.readWorkspaceFile`
- `vscode.searchWorkspaceText`
- `vscode.getDiagnostics`
- `vscode.executeCommand` with a configuration allowlist
- `vscode.reviewSelection` prompt
- `vscode/review-active-editor` skill
- active document, selection, and workspace folder resources

## Configuration

Use the `mdp.*` settings contributed by the extension:

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

## Validate

```bash
pnpm --filter @modeldriveprotocol/vscode-extension test
pnpm --filter @modeldriveprotocol/vscode-extension typecheck
```

## Debug

Open the repository root in VSCode and start the `MDP VSCode Extension` launch configuration.

For rebuild-on-save during extension development, run:

```bash
pnpm --filter @modeldriveprotocol/vscode-extension dev
```

The root workspace task and launch configuration live in `.vscode/tasks.json` and `.vscode/launch.json`.

## Build

```bash
pnpm --filter @modeldriveprotocol/vscode-extension build
```

The extension entry point is emitted to `apps/vscode-extension/dist/extension.js`.

## Release

Package a local `.vsix` with:

```bash
pnpm --filter @modeldriveprotocol/vscode-extension package:vsix
```

Publish to the Visual Studio Marketplace with:

```bash
VSCODE_EXTENSION_PUBLISHER=your-publisher-id VSCE_PAT=your-token \
pnpm --filter @modeldriveprotocol/vscode-extension publish:vsix
```

GitHub Actions workflows:

- `.github/workflows/vscode-extension-ci.yml` builds, tests, and uploads a `.vsix` artifact
- `.github/workflows/vscode-extension-release.yml` runs on `vscode-extension-v*` tags, packages the `.vsix`, publishes to Marketplace, and attaches the asset to a GitHub release
