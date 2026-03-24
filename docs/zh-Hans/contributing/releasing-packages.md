---
title: NPM 包发布
status: Draft
---

# NPM 包发布

当你要把 `@modeldriveprotocol/*` 包发布到 npm 时，走这条路径。

这条路径既覆盖 `packages/*` 下的 protocol、client、server，也覆盖通过 npm 分发的可发布 app package，例如 `@modeldriveprotocol/browser-simple-mdp-client`。

## 操作步骤

1. 用 `pnpm changeset` 准备要发布的包变更。
2. 把改动合入 `main`。
3. 在准备发布的提交上运行 `pnpm version-packages`，并提交版本号和 changelog 更新。
4. 创建并推送类似 `v1.0.0` 的 tag。
5. GitHub Actions 会触发 `.github/workflows/release.yml`。

## workflow 会做什么

- checkout 对应 tag 的提交
- 校验 tag 与待发布包版本一致
- 安装依赖
- 运行 `pnpm build`，递归构建 workspace 中的 packages 和 apps
- 运行 `pnpm test`，其中会在 smoke test 前重新构建 package 产物
- 运行 `pnpm publish:packages`
- 创建或更新对应的 GitHub Release

由于根级 `build` 和 `test` 已经包含 `@modeldriveprotocol/browser-simple-mdp-client`，所以只要它有版本变更，同一个 release workflow 就会一起校验并发布这个包。

## 仓库前置条件

- 对 `@modeldriveprotocol` npm scope 具有发布权限的 `NPM_TOKEN`

## 打 tag 前的本地校验

```bash
pnpm build
pnpm test
```
