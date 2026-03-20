---
title: 安全
status: Draft
---

# 安全

MDP 应该默认假设 client 可能暴露敏感的本地状态。

基础关注点包括：

- client 身份认证
- server 授权
- capability 级别访问控制
- 在不泄露敏感信息的前提下记录请求日志
- timeout 与 disconnect 清理

当前实现保持轻量，但已经具备明确的 auth 落点：

- transport 可以携带 `Authorization`、`Cookie` 或 `x-mdp-auth-*` 等认证头
- `registerClient.auth` 允许 client 发送消息级 auth envelope
- `callClient.auth` 允许 server 或 host 把调用 auth context 下发给 client
- server runtime 选项可挂 registration / invocation 的 authorization hooks

MDP 不应该通过发现 API 回显原始 secret。`listClients` 只暴露 auth 是否存在以及 transport 模式，不暴露具体凭据值。
