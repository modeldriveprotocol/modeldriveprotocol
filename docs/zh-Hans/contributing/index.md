---
title: 共建指南
status: Draft
---

# 共建指南

这一组文档面向参与仓库共建的贡献者和维护者，包括协议演进、运行时实现、文档维护、测试补充、发布自动化和仓库治理。

这一部分分成两条主线：

- 如何共建
- 如何发布

## 本地开发流程

在仓库根目录使用这些 repo 级命令：

```bash
pnpm install
pnpm test:unit
pnpm build
pnpm test
pnpm docs:build
```

这些命令与根目录 `AGENTS.md` 里的校验流程保持一致。

- `pnpm build` 会从仓库根目录递归执行 workspace 构建，而不是手写每个包的命令。
- `pnpm test` 在 smoke test 前会先重新构建 package。
- `pnpm docs:build` 在调用 VitePress 前会先准备生成出来的浏览器资源。

## 如何使用这一组文档

- 如果你先想弄清楚改动应该怎么在仓库里流转，先看 [项目架构](/zh-Hans/contributing/architecture)。
- 如果你想判断某类改动应当落在哪个目录，直接看对应模块开发指南。
- 如果你已经在准备正式发布，再看 [发布](/zh-Hans/contributing/releasing)。

## 常见共建流程

大多数改动可以按这个方式推进：

1. 先读根目录 `AGENTS.md` 和最近的 app / 目录级 `AGENTS.md`
2. 在正确层里做最小改动
3. 运行能够证明行为正确的最小本地校验
4. 如果协议形状、工作流或宿主行为发生变化，同步更新文档
5. 如果影响发布到 npm 的 `@modeldriveprotocol/*` 包，补一个 changeset

## 相关页面

- [项目架构](/zh-Hans/contributing/architecture)
- [环境准备](/zh-Hans/contributing/setup/)
- [发布](/zh-Hans/contributing/releasing)
- [NPM 包发布](/zh-Hans/contributing/releasing-packages)
- [应用发布](/zh-Hans/contributing/releasing-apps)
