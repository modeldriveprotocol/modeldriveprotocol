using ModelDriveProtocol.Client;
using Xunit;

namespace ModelDriveProtocol.Client.Tests;

public sealed class MdpClientTests
{
    [Fact]
    public async Task RegisterRequiresConnection()
    {
        FakeTransport transport = new();
        MdpClient client = new("ws://127.0.0.1:7070", new ClientInfo("dotnet-01", "C# Client"), transport);

        await Assert.ThrowsAsync<InvalidOperationException>(() => client.RegisterAsync());
    }

    [Fact]
    public async Task RegistersPathsAfterConnect()
    {
        FakeTransport transport = new();
        MdpClient client = new("ws://127.0.0.1:7070", new ClientInfo("dotnet-01", "C# Client"), transport);
        client
            .SetAuth(new AuthContext("Bearer", "client-token"))
            .ExposeEndpoint(
                "/goods",
                HttpMethod.GET,
                (_request, _context) => Task.FromResult<object?>(
                    new Dictionary<string, object?> { ["list"] = Array.Empty<object>(), ["total"] = 0 }),
                new EndpointOptions { Description = "List goods" });

        await client.ConnectAsync();
        await client.RegisterAsync(new ClientInfoOverride { Description = "Test C# client" });

        Assert.Single(transport.Sent);
        Assert.Equal("registerClient", transport.Sent[0]["type"]);
    }

    [Fact]
    public async Task HandlesPingAndInvocationMessages()
    {
        FakeTransport transport = new();
        MdpClient client = new("ws://127.0.0.1:7070", new ClientInfo("dotnet-01", "C# Client"), transport);
        client.ExposeEndpoint(
            "/goods/:id",
            HttpMethod.GET,
            (request, context) => Task.FromResult<object?>(
                new Dictionary<string, object?>
                {
                    ["id"] = request.Params["id"],
                    ["page"] = request.Queries["page"],
                    ["authToken"] = context.Auth?.Token
                }),
            new EndpointOptions());

        await client.ConnectAsync();
        transport.Emit(new PingMessage(123));
        transport.Emit(new CallClientMessage(
            "req-01",
            "dotnet-01",
            HttpMethod.GET,
            "/goods/sku-01",
            new Dictionary<string, object?>(),
            new Dictionary<string, object?> { ["page"] = 2L },
            null,
            new Dictionary<string, string>(),
            new AuthContext(Token: "host-token")));

        Assert.Equal(2, transport.Sent.Count);
        Assert.Equal("pong", transport.Sent[0]["type"]);
        Assert.Equal("callClientResult", transport.Sent[1]["type"]);
        Assert.True((bool)transport.Sent[1]["ok"]!);
    }

    private sealed class FakeTransport : IClientTransport
    {
        private Action<IServerToClientMessage>? onMessage;

        public List<Dictionary<string, object?>> Sent { get; } = [];

        public Task ConnectAsync(
            Action<IServerToClientMessage> onMessage,
            Action onClose,
            CancellationToken cancellationToken = default)
        {
            this.onMessage = onMessage;
            return Task.CompletedTask;
        }

        public Task SendAsync(
            Dictionary<string, object?> message,
            CancellationToken cancellationToken = default)
        {
            Sent.Add(message);
            return Task.CompletedTask;
        }

        public Task CloseAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;

        public void Emit(IServerToClientMessage message) => onMessage?.Invoke(message);
    }
}
