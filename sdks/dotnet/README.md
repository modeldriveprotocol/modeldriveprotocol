# `ModelDriveProtocol.Client`

C# client SDK for Model Drive Protocol.

## Install

```bash
dotnet add package ModelDriveProtocol.Client
```

## Quick start

```csharp
using ModelDriveProtocol.Client;

var client = new MdpClient(
    "ws://127.0.0.1:47372",
    new ClientInfo("dotnet-01", "C# Client"));

client.ExposeEndpoint(
    "/page/search",
    HttpMethod.POST,
    (request, _context) => Task.FromResult<object?>(
        new Dictionary<string, object?> { ["matches"] = 0 }),
    new EndpointOptions { Description = "Search the current runtime." });

await client.ConnectAsync();
await client.RegisterAsync();
```

## Included transports

- WebSocket: `ws://` / `wss://`
- HTTP loop: `http://` / `https://`

This SDK uses direct transport headers for runtime auth when needed.
