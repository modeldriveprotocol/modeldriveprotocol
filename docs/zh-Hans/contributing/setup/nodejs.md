---
title: Node.js
status: Draft
---

# Node.js

当你需要配置这个仓库当前实际使用的开发环境时，看这页。

## 这个环境目前用于哪些模块

当前仓库是一个 Node.js workspace。这个环境目前用于：

- `packages/protocol`
- `packages/client`
- `packages/server`
- `apps/chrome-extension`
- `apps/vscode-extension`
- `docs`
- `scripts`

## 准备 Node.js

本地开发建议使用 Node.js 20 或更高版本。仓库里既有面向 Node 的构建目标，也有依赖要求较新的 Node.js 版本。

最简单的准备流程是：

1. 安装 Node.js
2. 启用 `corepack`
3. 校验 `node` 和 `pnpm`
4. 安装 workspace 依赖

例如：

```bash
node -v
corepack enable
pnpm -v
```

## 安装依赖

以仓库根目录作为工作目录，先执行：

```bash
pnpm install
```

仓库在 `packageManager` 中声明了 `pnpm@10.28.0`，因此更推荐使用 `corepack` 管理的 pnpm，而不是混用其他包管理器。

## 常用根命令

```bash
pnpm test:unit
pnpm build
pnpm test
pnpm docs:dev
pnpm docs:build
```

## 应用级校验

如果你只改一个 app，先从它自己的命令开始：

```bash
pnpm --filter @modeldriveprotocol/chrome-extension typecheck
pnpm --filter @modeldriveprotocol/chrome-extension test
pnpm --filter @modeldriveprotocol/chrome-extension build

pnpm --filter @modeldriveprotocol/vscode-extension typecheck
pnpm --filter @modeldriveprotocol/vscode-extension test
pnpm --filter @modeldriveprotocol/vscode-extension build
```

## 相关页面

- [协议](/zh-Hans/contributing/modules/protocol)
- [服务端](/zh-Hans/contributing/modules/server)
- [JavaScript SDK](/zh-Hans/contributing/modules/sdks/javascript)
- [Chrome 插件](/zh-Hans/contributing/modules/apps/chrome-extension)
- [VSCode 插件](/zh-Hans/contributing/modules/apps/vscode-extension)
