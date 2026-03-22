---
title: VSCode 插件开发指南
status: Draft
---

# VSCode 插件开发指南

当你开发 `apps/vscode-extension` 里的应用时，使用这页。

## 构建与校验

先从 app 级命令开始：

```bash
pnpm --filter @modeldriveprotocol/vscode-extension typecheck
pnpm --filter @modeldriveprotocol/vscode-extension test
pnpm --filter @modeldriveprotocol/vscode-extension build
```

## 启动开发态插件

在 VSCode 中打开仓库根目录，然后启动 `MDP VSCode Extension`。

这个调试配置已经存在于：

- `.vscode/launch.json`
- `.vscode/tasks.json`

启动前任务会先构建扩展，再拉起 Extension Development Host。

## 保存即重建

如果你希望在 Extension Development Host 运行时自动重建，使用：

```bash
pnpm --filter @modeldriveprotocol/vscode-extension dev
```

这个脚本会为 `apps/vscode-extension` 启动 esbuild watcher。

## 连接本地 server

插件默认连接：

```text
ws://127.0.0.1:47372
```

你可以在 Extension Development Host 里通过 `mdp.serverUrl` 覆盖它。

## 调试方式

- 用 Extension Development Host 调试 extension-host 侧行为
- 断点命中目标是 `apps/vscode-extension/dist/**/*.js`
- 通过插件提供的状态与命令面确认连接状态

如果涉及发布打包路径，也顺手验证：

```bash
pnpm --filter @modeldriveprotocol/vscode-extension package:vsix
```
