using System.Text.Json;

namespace ModelDriveProtocol.Client;

public interface IServerToClientMessage;

public sealed record PingMessage(long Timestamp) : IServerToClientMessage;

public sealed record PongMessage(long Timestamp) : IServerToClientMessage;

public sealed record CallClientMessage(
    string RequestId,
    string ClientId,
    HttpMethod Method,
    string Path,
    IReadOnlyDictionary<string, object?> Params,
    IReadOnlyDictionary<string, object?> Query,
    object? Body,
    IReadOnlyDictionary<string, string> Headers,
    AuthContext? Auth) : IServerToClientMessage;

public static class ProtocolCodec
{
    public static Dictionary<string, object?> BuildRegisterClientMessage(
        ClientDescriptor client,
        AuthContext? auth)
    {
        Dictionary<string, object?> payload = new(StringComparer.Ordinal)
        {
            ["type"] = "registerClient",
            ["client"] = client.ToDictionary()
        };
        if (auth is not null)
        {
            payload["auth"] = auth.ToDictionary();
        }
        return payload;
    }

    public static Dictionary<string, object?> BuildUpdateClientCatalogMessage(
        string clientId,
        IReadOnlyList<PathDescriptor> paths) =>
        new(StringComparer.Ordinal)
        {
            ["type"] = "updateClientCatalog",
            ["clientId"] = clientId,
            ["paths"] = paths.Select(path => path.ToDictionary()).ToList()
        };

    public static Dictionary<string, object?> BuildUnregisterClientMessage(string clientId) =>
        new(StringComparer.Ordinal)
        {
            ["type"] = "unregisterClient",
            ["clientId"] = clientId
        };

    public static Dictionary<string, object?> BuildCallClientResultMessage(
        string requestId,
        bool ok,
        object? data,
        SerializedError? error)
    {
        Dictionary<string, object?> payload = new(StringComparer.Ordinal)
        {
            ["type"] = "callClientResult",
            ["requestId"] = requestId,
            ["ok"] = ok
        };
        if (ok)
        {
            payload["data"] = data;
        }
        else if (error is not null)
        {
            payload["error"] = error.ToDictionary();
        }
        return payload;
    }

    public static Dictionary<string, object?> BuildPongMessage(long timestamp) =>
        new(StringComparer.Ordinal)
        {
            ["type"] = "pong",
            ["timestamp"] = timestamp
        };

    public static IServerToClientMessage ParseServerToClientMessage(string payload)
    {
        using JsonDocument document = JsonDocument.Parse(payload);
        JsonElement root = document.RootElement;
        if (root.ValueKind != JsonValueKind.Object)
        {
            throw new InvalidOperationException("Invalid MDP message payload.");
        }

        string type = RequiredString(root, "type");
        return type switch
        {
            "ping" => new PingMessage(RequiredInt64(root, "timestamp")),
            "pong" => new PongMessage(RequiredInt64(root, "timestamp")),
            "callClient" => new CallClientMessage(
                RequiredString(root, "requestId"),
                RequiredString(root, "clientId"),
                Enum.Parse<HttpMethod>(RequiredString(root, "method"), ignoreCase: false),
                ParseCallPath(root),
                ObjectMap(root, "params"),
                ObjectMap(root, "query"),
                root.TryGetProperty("body", out JsonElement bodyElement) ? ToValue(bodyElement) : null,
                StringMap(root, "headers"),
                ParseAuthContext(root)),
            _ => throw new InvalidOperationException($"Unsupported MDP message type: {type}.")
        };
    }

    private static string ParseCallPath(JsonElement root)
    {
        string path = RequiredString(root, "path");
        if (!PathUtils.IsConcretePath(path))
        {
            throw new InvalidOperationException($"Invalid MDP path: {path}.");
        }
        return path;
    }

    private static AuthContext? ParseAuthContext(JsonElement root)
    {
        if (!root.TryGetProperty("auth", out JsonElement authElement) || authElement.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        return new AuthContext(
            TextOrNull(authElement, "scheme"),
            TextOrNull(authElement, "token"),
            StringMap(authElement, "headers"),
            ObjectMap(authElement, "metadata"));
    }

    private static string RequiredString(JsonElement parent, string propertyName)
    {
        if (!parent.TryGetProperty(propertyName, out JsonElement value) || value.ValueKind != JsonValueKind.String)
        {
            throw new InvalidOperationException($"Missing text field: {propertyName}.");
        }
        return value.GetString()!;
    }

    private static long RequiredInt64(JsonElement parent, string propertyName)
    {
        if (!parent.TryGetProperty(propertyName, out JsonElement value) || value.ValueKind != JsonValueKind.Number)
        {
            throw new InvalidOperationException($"Missing numeric field: {propertyName}.");
        }
        if (value.TryGetInt64(out long longValue))
        {
            return longValue;
        }
        return (long)value.GetDouble();
    }

    private static Dictionary<string, object?> ObjectMap(JsonElement parent, string propertyName)
    {
        if (!parent.TryGetProperty(propertyName, out JsonElement element) || element.ValueKind != JsonValueKind.Object)
        {
            return new Dictionary<string, object?>(StringComparer.Ordinal);
        }
        return ObjectMap(element);
    }

    private static Dictionary<string, object?> ObjectMap(JsonElement element)
    {
        Dictionary<string, object?> result = new(StringComparer.Ordinal);
        if (element.ValueKind != JsonValueKind.Object)
        {
            return result;
        }

        foreach (JsonProperty property in element.EnumerateObject())
        {
            result[property.Name] = ToValue(property.Value);
        }

        return result;
    }

    private static Dictionary<string, string> StringMap(JsonElement parent, string propertyName)
    {
        if (!parent.TryGetProperty(propertyName, out JsonElement element))
        {
            return new Dictionary<string, string>(StringComparer.Ordinal);
        }
        return StringMap(element);
    }

    private static Dictionary<string, string> StringMap(JsonElement element)
    {
        Dictionary<string, string> result = new(StringComparer.Ordinal);
        if (element.ValueKind != JsonValueKind.Object)
        {
            return result;
        }

        foreach (JsonProperty property in element.EnumerateObject())
        {
            if (property.Value.ValueKind == JsonValueKind.String)
            {
                result[property.Name] = property.Value.GetString()!;
            }
        }

        return result;
    }

    private static string? TextOrNull(JsonElement parent, string propertyName) =>
        parent.TryGetProperty(propertyName, out JsonElement value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    private static object? ToValue(JsonElement element) =>
        element.ValueKind switch
        {
            JsonValueKind.Object => ObjectMap(element),
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
}
