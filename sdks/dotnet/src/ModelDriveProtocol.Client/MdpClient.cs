namespace ModelDriveProtocol.Client;

public sealed class MdpClient
{
    private readonly object gate = new();
    private readonly ProcedureRegistry registry = new();
    private readonly IClientTransport transport;
    private ClientInfo clientInfo;
    private AuthContext? auth;
    private bool connected;
    private bool registered;

    public MdpClient(string serverUrl, ClientInfo clientInfo)
        : this(serverUrl, clientInfo, CreateDefaultTransport(serverUrl))
    {
    }

    public MdpClient(string serverUrl, ClientInfo clientInfo, IClientTransport transport)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(serverUrl);
        this.clientInfo = clientInfo ?? throw new ArgumentNullException(nameof(clientInfo));
        this.transport = transport ?? throw new ArgumentNullException(nameof(transport));
    }

    public MdpClient SetAuth(AuthContext? authContext)
    {
        lock (gate)
        {
            auth = authContext;
        }
        return this;
    }

    public MdpClient ExposeEndpoint(
        string path,
        HttpMethod method,
        PathHandler handler,
        EndpointOptions? options = null)
    {
        registry.ExposeEndpoint(path, method, handler, options);
        return this;
    }

    public MdpClient ExposeSkillMarkdown(string path, string content, SkillOptions? options = null)
    {
        registry.ExposeSkillMarkdown(path, content, options);
        return this;
    }

    public MdpClient ExposePromptMarkdown(string path, string content, PromptOptions? options = null)
    {
        registry.ExposePromptMarkdown(path, content, options);
        return this;
    }

    public ClientDescriptor Describe()
    {
        lock (gate)
        {
            return registry.Describe(clientInfo);
        }
    }

    public async Task ConnectAsync(CancellationToken cancellationToken = default)
    {
        await transport.ConnectAsync(
            message => _ = HandleMessageAsync(message),
            HandleTransportClose,
            cancellationToken);

        lock (gate)
        {
            connected = true;
        }
    }

    public async Task RegisterAsync(
        ClientInfoOverride? overrideInfo = null,
        CancellationToken cancellationToken = default)
    {
        AuthContext? authContext;
        lock (gate)
        {
            RequireConnected();
            clientInfo = clientInfo.Apply(overrideInfo);
            authContext = auth;
        }

        await transport.SendAsync(
            ProtocolCodec.BuildRegisterClientMessage(Describe(), authContext),
            cancellationToken);

        lock (gate)
        {
            registered = true;
        }
    }

    public Task SyncCatalogAsync(CancellationToken cancellationToken = default)
    {
        string clientId;
        IReadOnlyList<PathDescriptor> paths;
        lock (gate)
        {
            RequireConnected();
            RequireRegistered();
            clientId = clientInfo.Id;
            paths = registry.DescribePaths();
        }

        return transport.SendAsync(
            ProtocolCodec.BuildUpdateClientCatalogMessage(clientId, paths),
            cancellationToken);
    }

    public async Task DisconnectAsync(CancellationToken cancellationToken = default)
    {
        Dictionary<string, object?>? unregisterMessage = null;

        lock (gate)
        {
            if (connected && registered)
            {
                unregisterMessage = ProtocolCodec.BuildUnregisterClientMessage(clientInfo.Id);
            }
        }

        if (unregisterMessage is not null)
        {
            try
            {
                await transport.SendAsync(unregisterMessage, cancellationToken);
            }
            catch
            {
            }
        }

        await transport.CloseAsync(cancellationToken);

        lock (gate)
        {
            connected = false;
            registered = false;
        }
    }

    private async Task HandleMessageAsync(IServerToClientMessage message)
    {
        switch (message)
        {
            case PingMessage pingMessage:
                try
                {
                    await transport.SendAsync(ProtocolCodec.BuildPongMessage(pingMessage.Timestamp));
                }
                catch
                {
                }
                break;

            case CallClientMessage callClientMessage:
                try
                {
                    object? data = await registry.InvokeAsync(callClientMessage);
                    await transport.SendAsync(
                        ProtocolCodec.BuildCallClientResultMessage(
                            callClientMessage.RequestId,
                            ok: true,
                            data,
                            error: null));
                }
                catch (Exception error)
                {
                    try
                    {
                        await transport.SendAsync(
                            ProtocolCodec.BuildCallClientResultMessage(
                                callClientMessage.RequestId,
                                ok: false,
                                data: null,
                                SerializedError.Handler(error.InnerException?.Message ?? error.Message)));
                    }
                    catch
                    {
                    }
                }
                break;
        }
    }

    private void HandleTransportClose()
    {
        lock (gate)
        {
            connected = false;
            registered = false;
        }
    }

    private static IClientTransport CreateDefaultTransport(string serverUrl)
    {
        Uri uri = new(serverUrl);
        return uri.Scheme switch
        {
            "ws" or "wss" => new WebSocketClientTransport(serverUrl),
            "http" or "https" => new HttpLoopClientTransport(serverUrl),
            _ => throw new ArgumentException($"Unsupported MDP transport protocol: {uri.Scheme}", nameof(serverUrl))
        };
    }

    private void RequireConnected()
    {
        if (!connected)
        {
            throw new InvalidOperationException("MDP client is not connected");
        }
    }

    private void RequireRegistered()
    {
        if (!registered)
        {
            throw new InvalidOperationException("MDP client is not registered");
        }
    }
}
