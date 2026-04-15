using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace ModelDriveProtocol.Client;

public sealed class HttpLoopClientTransport : IClientTransport
{
    private const string DefaultEndpointPath = "/mdp/http-loop";
    private const string SessionHeader = "x-mdp-session-id";

    private readonly string serverUrl;
    private readonly string endpointPath;
    private readonly HttpClient httpClient;
    private readonly IReadOnlyDictionary<string, string> headers;
    private readonly object gate = new();
    private Action? onClose;
    private CancellationTokenSource? pollCancellation;
    private string? sessionId;
    private int closeEmitted;

    public HttpLoopClientTransport(
        string serverUrl,
        IReadOnlyDictionary<string, string>? headers = null,
        HttpClient? httpClient = null,
        string endpointPath = DefaultEndpointPath)
    {
        this.serverUrl = serverUrl;
        this.endpointPath = endpointPath;
        this.httpClient = httpClient ?? new HttpClient();
        this.headers = headers is null
            ? new Dictionary<string, string>(StringComparer.Ordinal)
            : new Dictionary<string, string>(headers, StringComparer.Ordinal);
    }

    public async Task ConnectAsync(
        Action<IServerToClientMessage> onMessage,
        Action onTransportClose,
        CancellationToken cancellationToken = default)
    {
        onClose = onTransportClose;
        closeEmitted = 0;

        Dictionary<string, object?> response = await SendJsonAsync(
            HttpMethod.POST,
            BuildEndpointUrl("/connect"),
            null,
            new Dictionary<string, object?>(StringComparer.Ordinal),
            cancellationToken);

        if (!response.TryGetValue("sessionId", out object? sessionIdValue) || sessionIdValue is not string connectedSessionId)
        {
            throw new InvalidOperationException("MDP HTTP loop transport did not return a sessionId.");
        }

        CancellationTokenSource pollingCancellation = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        lock (gate)
        {
            sessionId = connectedSessionId;
            pollCancellation = pollingCancellation;
        }

        _ = Task.Run(() => PollLoopAsync(onMessage, pollingCancellation.Token));
    }

    public Task SendAsync(
        Dictionary<string, object?> message,
        CancellationToken cancellationToken = default)
    {
        string currentSessionId = RequireSessionId();
        return SendJsonAsync(
            HttpMethod.POST,
            BuildEndpointUrl("/send"),
            new Dictionary<string, string>(StringComparer.Ordinal)
            {
                [SessionHeader] = currentSessionId
            },
            new Dictionary<string, object?>(StringComparer.Ordinal)
            {
                ["message"] = message
            },
            cancellationToken);
    }

    public async Task CloseAsync(CancellationToken cancellationToken = default)
    {
        string? currentSessionId;
        CancellationTokenSource? currentPollCancellation;
        lock (gate)
        {
            currentSessionId = sessionId;
            currentPollCancellation = pollCancellation;
            sessionId = null;
            pollCancellation = null;
        }

        currentPollCancellation?.Cancel();

        try
        {
            if (!string.IsNullOrWhiteSpace(currentSessionId))
            {
                await SendJsonAsync(
                    HttpMethod.POST,
                    BuildEndpointUrl("/disconnect"),
                    new Dictionary<string, string>(StringComparer.Ordinal)
                    {
                        [SessionHeader] = currentSessionId
                    },
                    new Dictionary<string, object?>(StringComparer.Ordinal),
                    cancellationToken);
            }
        }
        catch
        {
        }
        finally
        {
            currentPollCancellation?.Dispose();
            EmitClose();
        }
    }

    private async Task PollLoopAsync(
        Action<IServerToClientMessage> onMessage,
        CancellationToken cancellationToken)
    {
        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                string? currentSessionId;
                lock (gate)
                {
                    currentSessionId = sessionId;
                }

                if (string.IsNullOrWhiteSpace(currentSessionId))
                {
                    return;
                }

                string pollUrl = $"{BuildEndpointUrl("/poll")}?sessionId={Uri.EscapeDataString(currentSessionId)}&waitMs=25000";
                using HttpRequestMessage request = CreateRequest(HttpMethod.GET, pollUrl, null, null);
                using HttpResponseMessage response = await httpClient.SendAsync(request, cancellationToken);
                if (response.StatusCode == HttpStatusCode.NoContent)
                {
                    continue;
                }

                if (!response.IsSuccessStatusCode)
                {
                    return;
                }

                string body = await response.Content.ReadAsStringAsync(cancellationToken);
                using JsonDocument document = JsonDocument.Parse(body);
                if (!document.RootElement.TryGetProperty("message", out JsonElement messageElement))
                {
                    continue;
                }

                try
                {
                    onMessage(ProtocolCodec.ParseServerToClientMessage(messageElement.GetRawText()));
                }
                catch
                {
                }
            }
        }
        catch (OperationCanceledException)
        {
        }
        catch
        {
        }
        finally
        {
            EmitClose();
        }
    }

    private async Task<Dictionary<string, object?>> SendJsonAsync(
        HttpMethod method,
        string requestUrl,
        IReadOnlyDictionary<string, string>? extraHeaders,
        Dictionary<string, object?>? payload,
        CancellationToken cancellationToken)
    {
        using HttpRequestMessage request = CreateRequest(method, requestUrl, extraHeaders, payload);
        using HttpResponseMessage response = await httpClient.SendAsync(request, cancellationToken);
        string body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"MDP HTTP loop request failed with status {(int)response.StatusCode}.");
        }

        if (string.IsNullOrWhiteSpace(body))
        {
            return new Dictionary<string, object?>(StringComparer.Ordinal);
        }

        using JsonDocument document = JsonDocument.Parse(body);
        return document.RootElement.ValueKind == JsonValueKind.Object
            ? document.RootElement.EnumerateObject().ToDictionary(
                property => property.Name,
                property => ToValue(property.Value),
                StringComparer.Ordinal)
            : new Dictionary<string, object?>(StringComparer.Ordinal);
    }

    private HttpRequestMessage CreateRequest(
        HttpMethod method,
        string requestUrl,
        IReadOnlyDictionary<string, string>? extraHeaders,
        Dictionary<string, object?>? payload)
    {
        HttpRequestMessage request = new(method switch
        {
            HttpMethod.GET => System.Net.Http.HttpMethod.Get,
            HttpMethod.POST => System.Net.Http.HttpMethod.Post,
            HttpMethod.PUT => System.Net.Http.HttpMethod.Put,
            HttpMethod.PATCH => System.Net.Http.HttpMethod.Patch,
            HttpMethod.DELETE => System.Net.Http.HttpMethod.Delete,
            _ => throw new InvalidOperationException($"Unsupported HTTP method: {method}.")
        }, requestUrl);

        foreach ((string key, string value) in headers)
        {
            request.Headers.TryAddWithoutValidation(key, value);
        }
        if (extraHeaders is not null)
        {
            foreach ((string key, string value) in extraHeaders)
            {
                request.Headers.TryAddWithoutValidation(key, value);
            }
        }
        if (payload is not null)
        {
            request.Content = JsonContent.Create(payload);
        }
        return request;
    }

    private string RequireSessionId()
    {
        lock (gate)
        {
            if (string.IsNullOrWhiteSpace(sessionId))
            {
                throw new InvalidOperationException("MDP client is not connected");
            }
            return sessionId;
        }
    }

    private string BuildEndpointUrl(string suffix)
    {
        Uri baseUri = new(serverUrl.EndsWith("/", StringComparison.Ordinal) ? serverUrl : $"{serverUrl}/");
        string relativePath = $"{endpointPath.TrimStart('/')}{suffix}";
        return new Uri(baseUri, relativePath).ToString();
    }

    private static object? ToValue(JsonElement element) =>
        element.ValueKind switch
        {
            JsonValueKind.Object => element.EnumerateObject().ToDictionary(
                property => property.Name,
                property => ToValue(property.Value),
                StringComparer.Ordinal),
            JsonValueKind.Array => element.EnumerateArray().Select(ToValue).ToList(),
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Number when element.TryGetInt64(out long longValue) => longValue,
            JsonValueKind.Number => element.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            JsonValueKind.Undefined => null,
            _ => null
        };

    private void EmitClose()
    {
        if (Interlocked.Exchange(ref closeEmitted, 1) == 0)
        {
            onClose?.Invoke();
        }
    }
}
