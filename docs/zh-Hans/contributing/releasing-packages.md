---
title: NPM 包发布
status: Draft
---

# NPM 包发布

当你要把 `@modeldriveprotocol/*` 包发布到 npm 时，走这条路径。

## 操作步骤

1. 用 `pnpm changeset` 准备要发布的包变更。
2. 把改动合入 `main`。
3. 在准备发布的提交上运行 `pnpm version-packages`，并提交版本号和 changelog 更新。
4. 创建并推送类似 `v0.1.1` 的 tag。
5. GitHub Actions 会触发 `.github/workflows/release.yml`。

## workflow 会做什么

- checkout 对应 tag 的提交
- 安装依赖
- 运行 `pnpm build`
- 运行 `pnpm test`
- 运行 `pnpm publish:packages`

## 仓库前置条件

- secret `NPM_TOKEN`

## 打 tag 前的本地校验

```bash
pnpm build
pnpm test
```
