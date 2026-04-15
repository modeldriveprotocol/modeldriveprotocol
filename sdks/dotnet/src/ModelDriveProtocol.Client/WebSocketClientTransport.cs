using System.Net.WebSockets;
using System.Text;

namespace ModelDriveProtocol.Client;

public sealed class WebSocketClientTransport : IClientTransport
{
    private readonly Uri serverUri;
    private readonly IReadOnlyDictionary<string, string> headers;
    private readonly object gate = new();
    private ClientWebSocket? socket;
    private Action? onClose;
    private int closeEmitted;

    public WebSocketClientTransport(string serverUrl, IReadOnlyDictionary<string, string>? headers = null)
    {
        serverUri = new Uri(serverUrl);
        this.headers = headers is null
            ? new Dictionary<string, string>(StringComparer.Ordinal)
            : new Dictionary<string, string>(headers, StringComparer.Ordinal);
    }

    public async Task ConnectAsync(
        Action<IServerToClientMessage> onMessage,
        Action onTransportClose,
        CancellationToken cancellationToken = default)
    {
        ClientWebSocket clientWebSocket = new();
        foreach ((string key, string value) in headers)
        {
            clientWebSocket.Options.SetRequestHeader(key, value);
        }

        await clientWebSocket.ConnectAsync(serverUri, cancellationToken);

        lock (gate)
        {
            socket = clientWebSocket;
            onClose = onTransportClose;
            closeEmitted = 0;
        }

        _ = Task.Run(() => ReceiveLoopAsync(clientWebSocket, onMessage));
    }

    public async Task SendAsync(
        Dictionary<string, object?> message,
        CancellationToken cancellationToken = default)
    {
        ClientWebSocket? currentSocket;
        lock (gate)
        {
            currentSocket = socket;
        }

        if (currentSocket is null || currentSocket.State != WebSocketState.Open)
        {
            throw new InvalidOperationException("MDP client is not connected");
        }

        byte[] payload = Encoding.UTF8.GetBytes(System.Text.Json.JsonSerializer.Serialize(message));
        await currentSocket.SendAsync(payload, WebSocketMessageType.Text, true, cancellationToken);
    }

    public async Task CloseAsync(CancellationToken cancellationToken = default)
    {
        ClientWebSocket? currentSocket;
        lock (gate)
        {
            currentSocket = socket;
            socket = null;
        }

        if (currentSocket is null)
        {
            EmitClose();
            return;
        }

        try
        {
            if (currentSocket.State is WebSocketState.Open or WebSocketState.CloseReceived)
            {
                await currentSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "closing", cancellationToken);
            }
        }
        finally
        {
            currentSocket.Dispose();
            EmitClose();
        }
    }

    private async Task ReceiveLoopAsync(
        ClientWebSocket currentSocket,
        Action<IServerToClientMessage> onMessage)
    {
        byte[] buffer = new byte[4096];
        using MemoryStream stream = new();

        try
        {
            while (currentSocket.State == WebSocketState.Open)
            {
                WebSocketReceiveResult result = await currentSocket.ReceiveAsync(buffer, CancellationToken.None);
                if (result.MessageType == WebSocketMessageType.Close)
                {
                    break;
                }

                stream.Write(buffer, 0, result.Count);
                if (!result.EndOfMessage)
                {
                    continue;
                }

                string payload = Encoding.UTF8.GetString(stream.GetBuffer(), 0, checked((int)stream.Length));
                stream.SetLength(0);

                try
                {
                    onMessage(ProtocolCodec.ParseServerToClientMessage(payload));
                }
                catch
                {
                }
            }
        }
        catch
        {
        }
        finally
        {
            lock (gate)
            {
                if (ReferenceEquals(socket, currentSocket))
                {
                    socket = null;
                }
            }
            currentSocket.Dispose();
            EmitClose();
        }
    }

    private void EmitClose()
    {
        if (Interlocked.Exchange(ref closeEmitted, 1) == 0)
        {
            onClose?.Invoke();
        }
    }
}
