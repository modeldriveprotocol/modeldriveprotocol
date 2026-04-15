---
title: 简易上手
status: Draft
---

# C# SDK / 简易上手

当你的 MDP client 运行在桌面应用、本地 worker、服务进程或 .NET 工具里时，使用 C# SDK。

## 1. 安装包

```bash
dotnet add package ModelDriveProtocol.Client
```

## 2. 创建 client

```csharp
using ModelDriveProtocol.Client;

var client = new MdpClient(
    "ws://127.0.0.1:47372",
    new ClientInfo("dotnet-01", "C# Client"));
```

## 3. 暴露一个路径

```csharp
client.ExposeEndpoint(
    "/page/search",
    HttpMethod.POST,
    (request, _context) => Task.FromResult<object?>(
        new Dictionary<string, object?> { ["matches"] = 0 }),
    new EndpointOptions { Description = "Search the current runtime." });
```

## 4. 连接并注册

```csharp
await client.ConnectAsync();
await client.RegisterAsync();
```

## 当前 transport 支持

C# SDK 当前支持：

- `ws` / `wss`
- `http` / `https` loop mode

如果你要看维护者视角的开发、调试和本地验证流程，继续阅读 [C# SDK 开发指南](/zh-Hans/contributing/modules/sdks/dotnet)。
