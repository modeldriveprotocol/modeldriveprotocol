---
title: 项目架构
status: Draft
---

# 项目架构

这个仓库按层拆分，目的是让协议模型、运行时、应用、文档和自动化可以分别演进，而不是堆成一个大包。

## 改动流转顺序

如果一项改动会跨多层，建议按这个顺序推进：

1. 协议类型
2. 运行时实现
3. 测试
4. 需要时补 smoke coverage
5. 文档

这样做的目的是先稳定契约，再推进行为实现，最后补验证和说明。

## 核心分层

- `packages/protocol`
  负责消息 schema、guards、错误模型和协议契约
- `packages/server`
  负责注册生命周期、路由、传输层和固定 MCP bridge
- `packages/client`
  负责 client SDK、浏览器入口和传输客户端
- `apps/*`
  负责 Chrome、VSCode 这类宿主侧集成
- `docs`
  负责协议说明、示例、指南和站点导航
- `.github`
  负责 CI、发布 workflow 和可复用 GitHub Actions 构件

## 由架构推导出的共建规则

- 协议形状改动先从 `packages/protocol` 开始。
- server 不要编码浏览器专属假设。
- client 不要依赖 server 的内部实现细节。
- docs 要描述预期行为，而不是偶然实现。
- CI 复用只抽公共步骤，例如环境准备和共享 package 构建，不要把整条流水线过度抽象。

## 校验路径

优先运行能够证明改动正确的最小校验；只有当改动跨层时，再扩大验证范围：

```bash
pnpm test:unit
pnpm build
pnpm test
pnpm docs:build
```

根级脚本现在按职责分层：

- `pnpm build` 是递归的 workspace 构建入口。
- `pnpm test` 是更完整的仓库级校验路径，包含 smoke test 前的重新构建。
- `pnpm docs:build` 会先准备文档资源，再构建站点。
