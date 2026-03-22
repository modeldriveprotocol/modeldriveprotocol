---
title: 应用发布
status: Draft
---

# 应用发布

当你要发布应用构件而不是 npm 包时，走这条路径。

当前仓库里有两类应用发布：

- Chrome 扩展 zip
- VSCode 扩展 VSIX

如果目标是 `@modeldriveprotocol/browser-simple-mdp-client`，不要走这页。这个 app 通过 NPM 包发布链路发版，而不是单独的构件发布 workflow。

## Chrome 插件发布

当你要产出一个可下载的 Chrome 扩展 zip，并把它挂到 GitHub Release 时，走这条路径。

### 操作步骤

1. 更新 `apps/chrome-extension/src/manifest.json` 中的版本号。
2. 保持 `apps/chrome-extension/package.json` 版本一致。
3. 创建并推送类似 `chrome-extension-v0.1.0` 的 tag。
4. GitHub Actions 会触发 `.github/workflows/chrome-extension-release.yml`。

### workflow 会先校验什么

- tag 版本是否和 `manifest.json` 一致
- tag 版本是否和 `package.json` 一致

### workflow 会做什么

- typecheck 和 test
- 构建扩展打包依赖的共享 workspace packages
- 构建 Chrome 扩展
- 把 `apps/chrome-extension/dist` 打成 zip
- 在 workflow 内上传构件
- 创建或更新对应 tag 的 GitHub Release，并附上 zip

## VSCode 插件发布

当你要把 VSIX 发布到 VS Code Marketplace，并同时挂到 GitHub Release 时，走这条路径。

### 操作步骤

1. 更新 `apps/vscode-extension/package.json` 里的版本号。
2. 创建并推送类似 `vscode-extension-v0.1.0` 的 tag。
3. GitHub Actions 会触发 `.github/workflows/vscode-extension-release.yml`。

### workflow 会先校验什么

- tag 版本是否和 `apps/vscode-extension/package.json` 一致
- 仓库变量 `VSCODE_EXTENSION_PUBLISHER` 是否存在

### workflow 会做什么

- typecheck 和 test
- 构建扩展打包依赖的共享 workspace packages
- 构建 VSCode 扩展
- 打包 `.vsix`
- 在 workflow 内上传 `.vsix` 构件
- 把 `.vsix` 发布到 VS Code Marketplace
- 创建或更新对应 tag 的 GitHub Release，并附上 `.vsix`

## 仓库前置条件

- repository variable `VSCODE_EXTENSION_PUBLISHER`
- secret `VSCE_PAT`

## 打 tag 前的本地校验

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
