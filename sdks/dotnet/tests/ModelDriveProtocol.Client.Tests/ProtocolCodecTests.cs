using ModelDriveProtocol.Client;
using Xunit;

namespace ModelDriveProtocol.Client.Tests;

public sealed class ProtocolCodecTests
{
    [Fact]
    public void ParseServerToClientMessageReadsNestedAuthHeaders()
    {
        string payload = """
            {
              "type": "callClient",
              "requestId": "req-01",
              "clientId": "client-01",
              "method": "GET",
              "path": "/goods/sku-01",
              "params": {},
              "query": {},
              "headers": {
                "x-trace-id": "trace-01"
              },
              "auth": {
                "scheme": "Bearer",
                "token": "host-token",
                "headers": {
                  "x-mdp-auth": "signed"
                },
                "metadata": {
                  "tenant": "acme"
                }
              }
            }
            """;

        CallClientMessage message = Assert.IsType<CallClientMessage>(ProtocolCodec.ParseServerToClientMessage(payload));

        Assert.Equal("host-token", message.Auth?.Token);
        Assert.Equal("signed", message.Auth?.Headers?["x-mdp-auth"]);
        Assert.False(message.Auth?.Headers?.ContainsKey("scheme") ?? true);
    }
}
