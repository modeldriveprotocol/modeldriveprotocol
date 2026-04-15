---
title: Rust SDK 开发指南
status: Draft
---

# Rust SDK 开发指南

当你开发 `sdks/rust` 时，使用这页。

## 这个模块负责什么

`sdks/rust` 负责：

- Rust 协议镜像类型
- 路径匹配和 registry 行为
- async client lifecycle 与 routed invocation handling
- websocket 和 HTTP loop transport
- crate 元数据和 Rust 侧测试

它不负责：

- `packages/protocol` 下的协议真源
- `packages/server` 下的服务端行为
- JVM 或 Python 的运行时打包问题

## 构建与测试

先从 crate 级命令开始：

```bash
cargo test --manifest-path sdks/rust/Cargo.toml
cargo package --manifest-path sdks/rust/Cargo.toml
```

它们分别证明：

- `cargo test`
  验证 registry 行为、client lifecycle、ping/pong 和 invocation handling
- `cargo package`
  证明当前 manifest 能正确组装出可发布 crate

## 常见开发回路

常见回路是：

1. 修改 `sdks/rust/src/**`
2. 运行 `cargo test --manifest-path sdks/rust/Cargo.toml`
3. 如果 manifest、README 或 public export 变了，再运行 `cargo package --manifest-path sdks/rust/Cargo.toml`
4. 如果行为跟随协议变化，再去对照 `packages/protocol/src/**`

## 调试预期

先判断问题落在哪一层：

- `src/path_utils.rs`
  路径校验或 specificity
- `src/registry.rs`
  handler 解析和 invocation shaping
- `src/client.rs`
  连接生命周期或 register/sync/disconnect 流程
- `src/transport.rs`
  线传输和 session 行为

当真实 transport 出问题时，先把原始 text frame 或 HTTP payload 打出来，再改 typed struct。这里最常见的首个错位其实是 JSON 字段名，不是 async 控制流。

## 常见故障

- `NotConnected`
  在 `connect()` 前调用了 `register()` 或 `sync_catalog()`
- `UnknownPath`
  注册 pattern 和收到的路径在段数或保留叶子形状上不匹配
- `CallClientResult` 里出现 handler error
  注册 closure 返回了错误，或者对 request body 形状假设错了
- websocket 建链失败
  先检查 URL scheme、TLS 假设和请求头，再改消息逻辑

## 发布与打包说明

这个 SDK 走共享的 `v*` release workflow。

本地发布前检查：

```bash
cargo test --manifest-path sdks/rust/Cargo.toml
cargo package --manifest-path sdks/rust/Cargo.toml
```

仓库侧的发布要求放在 [多语言 SDK 包发布](/zh-Hans/contributing/releasing-sdks)。
