---
title: 安全
status: Draft
---

# 安全

MDP 默认认为 client 可能暴露本地敏感状态，所以 server 必须把注册和调用都视为策略边界。

## 认证入口

当前实现可以从多个位置接收认证信息：

- `Authorization`、`Cookie`、`x-mdp-auth-*` 等 transport headers
- `POST /mdp/auth`，用于浏览器 websocket 的 `HttpOnly` cookie 引导
- `registerClient.auth`，用于消息级注册认证
- `callClient.auth`，用于调用阶段向 client 下发认证上下文

## 鉴权钩子

运行时暴露了两个明确的策略钩子：

- `authorizeRegistration`
- `authorizeInvocation`

这些钩子拿到的不只是会话信息，也包括 server 已观察到的 transport 级与消息级认证信息。

## TLS 与安全端点

如果要暴露安全 transport 端点，可以在启动 CLI 时提供证书和私钥：

```bash
npx @modeldriveprotocol/server --port 7070 --tls-key ./certs/server-key.pem --tls-cert ./certs/server-cert.pem
```

启用 TLS 后，端点会变成：

- `wss://127.0.0.1:7070`
- `https://127.0.0.1:7070/mdp/http-loop`
- `https://127.0.0.1:7070/mdp/auth`

## 运行期保护

基线保护还包括：

- 基于 heartbeat 的断连清理
- 调用超时
- 相同 client ID 重连时的会话替换
- 发现接口只暴露是否存在 auth，不回显密钥原文

更底层的 transport 细节可以继续阅读 [协议安全](/zh-Hans/protocol/security) 和 [传输](/zh-Hans/protocol/transport)。
