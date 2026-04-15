namespace ModelDriveProtocol.Client;

public interface IClientTransport
{
    Task ConnectAsync(
        Action<IServerToClientMessage> onMessage,
        Action onClose,
        CancellationToken cancellationToken = default);

    Task SendAsync(
        Dictionary<string, object?> message,
        CancellationToken cancellationToken = default);

    Task CloseAsync(CancellationToken cancellationToken = default);
}
