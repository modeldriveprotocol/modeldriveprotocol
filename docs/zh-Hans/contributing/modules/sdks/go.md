---
title: Go SDK 开发指南
status: Draft
---

# Go SDK 开发指南

当你在开发 `sdks/go` 时，使用这页。

## 这个模块负责什么

`sdks/go` 负责：

- Go 协议模型和消息辅助函数
- registry 行为和路径匹配
- websocket 与 HTTP loop client transport
- module metadata 和 Go 侧单测

它不负责：

- `packages/protocol` 下的协议源事实
- `packages/server` 下的 server 路由逻辑
- JavaScript SDK 里的浏览器 auth bootstrap 行为

## 本地准备

使用 Go 1.24 或更新版本，并在 SDK 目录下工作：

```bash
cd sdks/go
go env GOMOD
go test ./...
```

## 构建与测试

优先使用模块级命令：

```bash
cd sdks/go
go test ./...
go test -run TestHandlesPingAndInvocationMessages ./...
```

这些命令分别证明：

- `go test ./...`
  覆盖 registry 行为、register 流程、ping/pong 处理和 module 连通性
- 定向 `go test -run ...`
  适合在定位单个生命周期问题时缩短反馈回路

## 常见开发流程

典型循环：

1. 修改 `sdks/go/*.go`
2. 运行 `gofmt -w *.go`
3. 运行 `go test ./...`
4. 如果行为是在跟随协议变化，同步验证对应的 TypeScript protocol package

## 调试预期

先从最窄的一层证明问题：

- registry / path 问题：
  在 `registry_test.go` 里补或改测试
- 生命周期问题：
  在 `client_test.go` 里补或改测试
- transport 问题：
  先用 fake server 或注入式 HTTP/WebSocket client 隔离 transport

如果是真实运行时会话失败，先检查原始 JSON 形状，再决定要不要改 Go 模型。这里最常见的一次失败原因仍然是 path 形状不匹配、auth 字段缺失，或者 transport session 假设不成立。

## 常见失败模式

- `MDP client is not connected`
  `Register()` 或 `SyncCatalog()` 在 `Connect()` 之前执行了
- routed invocation 找不到路径
  注册时的 path pattern 和实际调用 path 的 segment 数量不一致
- skill 或 prompt path 上出现 handler error
  把保留的 `skill.md` 或 `prompt.md` 叶子错误地当成 endpoint 暴露了
- HTTP loop session 意外关闭
  改 client 逻辑前，先检查 `/connect`、`/send`、`/poll` 的状态码

## 发布与打包说明

这个 SDK 通过 Go module 源码分发。共享 `v*` release workflow 还会额外创建类似 `sdks/go/v2.2.0` 的前缀 tag。

本地预检：

```bash
cd sdks/go
go test ./...
```

仓库侧发布要求见 [多语言 SDK 包发布](/zh-Hans/contributing/releasing-sdks)。
