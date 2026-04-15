---
title: C# SDK 开发指南
status: Draft
---

# C# SDK 开发指南

当你在开发 `sdks/dotnet` 时，使用这页。

## 这个模块负责什么

`sdks/dotnet` 负责：

- C# 协议模型和消息辅助函数
- registry 行为和路径匹配
- websocket 与 HTTP loop client transport
- NuGet package metadata 和 .NET 侧单测

它不负责：

- `packages/protocol` 下的协议源事实
- `packages/server` 下的 server 路由逻辑
- JavaScript SDK 里的浏览器 auth bootstrap 行为

## 本地准备

使用 .NET 8 SDK，并在仓库根目录或 SDK 目录下工作：

```bash
dotnet --info
dotnet test sdks/dotnet/ModelDriveProtocol.sln
```

## 构建与测试

优先使用 SDK 级命令：

```bash
dotnet test sdks/dotnet/ModelDriveProtocol.sln
dotnet pack sdks/dotnet/src/ModelDriveProtocol.Client/ModelDriveProtocol.Client.csproj -c Release -o sdks/dotnet/artifacts
```

这些命令分别证明：

- `dotnet test`
  覆盖 registry 行为、register 流程、ping/pong 处理和 invocation 路由
- `dotnet pack`
  证明 NuGet metadata 和包构建过程仍然正确

## 常见开发流程

典型循环：

1. 修改 `sdks/dotnet/src/**`
2. 运行 `dotnet test sdks/dotnet/ModelDriveProtocol.sln`
3. 如果 package metadata 改了，再运行 `dotnet pack ...`
4. 如果行为是在跟随协议变化，同步验证对应的 TypeScript protocol package

## 调试预期

先从最窄的一层证明问题：

- registry / path 问题：
  在 `ProcedureRegistryTests.cs` 里补或改测试
- 生命周期问题：
  在 `MdpClientTests.cs` 里补或改测试
- transport 问题：
  先用 fake server 或可注入的 `HttpClient` 隔离 transport

如果要调真实运行时会话，先抓 JSON message payload，再决定要不要改 C# 模型。这里最常见的一次失败原因仍然是 message shape 漂移、path 形状不匹配，或者 transport 的重连假设不成立。

## 常见失败模式

- `MDP client is not connected`
  `RegisterAsync()` 或 `SyncCatalogAsync()` 在 `ConnectAsync()` 之前执行了
- routed invocation 找不到路径
  注册时的 path pattern 和实际调用 path 的 segment 数量不一致
- skill 或 prompt path 上出现 handler error
  把保留的 `skill.md` 或 `prompt.md` 叶子错误地当成 endpoint 暴露了
- NuGet pack 失败
  package metadata、README 打包或输出路径配置不完整

## 发布与打包说明

这个 SDK 通过共享 `v*` release workflow 以 `ModelDriveProtocol.Client` NuGet package 的形式发布。

本地预检：

```bash
dotnet test sdks/dotnet/ModelDriveProtocol.sln
dotnet pack sdks/dotnet/src/ModelDriveProtocol.Client/ModelDriveProtocol.Client.csproj -c Release -o sdks/dotnet/artifacts
```

仓库侧发布要求见 [多语言 SDK 包发布](/zh-Hans/contributing/releasing-sdks)。
