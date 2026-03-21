---
title: 发布总览
status: Draft
---

# 发布总览

这个仓库的发布分成两条主线：

- NPM 包发布
- 应用发布

应用发布目前包含两类产物：

- Chrome 扩展 zip
- VSCode 扩展 VSIX

每条路径都由不同的 tag 规则触发，也有各自的校验条件。

## 创建 release tag 前先确认

1. 对应 CI 已通过。
2. app 或 package 里的版本号已经更新正确。
3. 所需 secret 或 repository variable 已配置。
4. tag 指向的就是你要发布的那次提交。

## 详细发布指南

- [NPM 包发布](/zh-Hans/contributing/releasing-packages)
- [应用发布](/zh-Hans/contributing/releasing-apps)

## 共享 workflow 构件

发布 workflow 目前复用了两个边界很窄的 composite action：

- `.github/actions/setup-workspace/action.yml`
  在 checkout 后安装 `pnpm`、Node.js 和依赖
- `.github/actions/build-workspace-package-deps/action.yml`
  在扩展打包前构建 `@modeldriveprotocol/protocol` 和 `@modeldriveprotocol/client`

这些共享 action 只覆盖重复的环境准备和共享 package 构建步骤。tag 规则、版本校验、构件命名和真正的发布动作，仍然留在各自的 workflow 中。
