---
title: Chrome 插件开发指南
status: Draft
---

# Chrome 插件开发指南

当你开发 `apps/chrome-extension` 里的应用时，使用这页。

## 这个模块负责什么

Chrome 插件应用负责：

- background service worker 生命周期
- Chrome 能力注册
- content script 和 main-world bridge 行为
- popup 和 options UI

## 构建与校验

先跑 app 级命令：

```bash
pnpm --filter @modeldriveprotocol/chrome-extension typecheck
pnpm --filter @modeldriveprotocol/chrome-extension test
pnpm --filter @modeldriveprotocol/chrome-extension build
```

unpacked extension 产物位于：

```text
apps/chrome-extension/dist/chrome-mv3
```

## 本地启动回路

先按你想要的调试方式选一条回路：

- `dev`：让 WXT 自动拉起一个专用 Chrome
- `dev:manual`：继续用你自己的 Chrome，WXT 只负责监听和重建
- `build`：只产出一次生产式 unpacked build
- `paths`：打印手动加载和持久化 profile 的本地目录

本地迭代时，先启动 WXT dev mode：

```bash
pnpm --filter @modeldriveprotocol/chrome-extension dev
```

如果你希望只保留 WXT 的构建/监听能力，而继续使用自己常用的 Chrome 手动加载插件，可以改用：

```bash
pnpm --filter @modeldriveprotocol/chrome-extension dev:manual
```

仓库根目录现在也带了：

- `.vscode/tasks.json` 里的 `mdp:chrome-extension dev`
- `.vscode/tasks.json` 里的 `mdp:chrome-extension dev (manual load)`
- `.vscode/tasks.json` 里的 `mdp:chrome-extension paths`
- `.vscode/launch.json` 里的 `MDP Chrome Extension (WXT Dev)`
- `.vscode/launch.json` 里的 `MDP Chrome Extension (Manual Load)`

当前仓库里的 WXT 配置还会把持久化 Chromium profile 放在
`apps/chrome-extension/.wxt/chrome-data`，这样登录态和浏览器侧调试设置在重启后还能保留。

如果你需要只影响自己机器的 runner 配置，可以新建
`apps/chrome-extension/web-ext.config.ts`。这个文件已经被 gitignore 忽略，适合放个人的浏览器启动覆盖配置。
仓库里也提供了一个现成模板：
`apps/chrome-extension/web-ext.config.example.ts`。

常见回路是：

1. 运行 `pnpm --filter @modeldriveprotocol/chrome-extension dev`
2. 等 WXT 自动拉起一个已加载插件的 Chrome
3. 直接在这个开发浏览器里验证 popup、options、content script 或 background 行为

如果你需要手动加载 unpacked build，而不是用 WXT 自带的开发浏览器，就运行 `pnpm --filter @modeldriveprotocol/chrome-extension build`，然后在 `chrome://extensions` 里加载 `apps/chrome-extension/dist/chrome-mv3`。
如果你想保留 dev watcher，但浏览器仍然自己开，就运行 `pnpm --filter @modeldriveprotocol/chrome-extension dev:manual`，然后手动加载 `apps/chrome-extension/dist/chrome-mv3-dev`。
如果你想直接看自己机器上的绝对路径，就运行 `pnpm --filter @modeldriveprotocol/chrome-extension paths`。

## 连接本地 server

在 options 页面里设置 `MDP Server URL`，通常使用：

```text
ws://127.0.0.1:47372
```

同时配置需要注入的目标 match patterns。

## 调试方式

把 `chrome://extensions` 当作主调试入口：

- 需要手动验证生产式构建产物时，加载 `dist/chrome-mv3`
- 调试 background 生命周期或连接问题时，inspect service worker
- 调试 content script 或 DOM 自动化行为时，inspect 当前页面

如果改动同时涉及共享 packages，重跑更宽的构建链路再验证：

```bash
pnpm build
```
