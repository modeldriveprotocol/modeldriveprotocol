---
title: Quick Start
status: Draft
---

# C# Quick Start

Use the C# SDK when your MDP client runs inside a desktop app, local worker, service process, or .NET tool.

## 1. Install the package

```bash
dotnet add package ModelDriveProtocol.Client
```

## 2. Create a client

```csharp
using ModelDriveProtocol.Client;

var client = new MdpClient(
    "ws://127.0.0.1:47372",
    new ClientInfo("dotnet-01", "C# Client"));
```

## 3. Expose one path

```csharp
client.ExposeEndpoint(
    "/page/search",
    HttpMethod.POST,
    (request, _context) => Task.FromResult<object?>(
        new Dictionary<string, object?> { ["matches"] = 0 }),
    new EndpointOptions { Description = "Search the current runtime." });
```

## 4. Connect and register

```csharp
await client.ConnectAsync();
await client.RegisterAsync();
```

## Transport support

The C# SDK currently supports:

- `ws` / `wss`
- `http` / `https` loop mode

For contributor workflow, debugging notes, and local package validation, continue with [C# SDK Guide](/contributing/modules/sdks/dotnet).
