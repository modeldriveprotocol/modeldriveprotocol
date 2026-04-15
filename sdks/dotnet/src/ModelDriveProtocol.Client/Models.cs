namespace ModelDriveProtocol.Client;

public enum HttpMethod
{
    GET,
    POST,
    PUT,
    PATCH,
    DELETE
}

public sealed record AuthContext(
    string? Scheme = null,
    string? Token = null,
    IReadOnlyDictionary<string, string>? Headers = null,
    IReadOnlyDictionary<string, object?>? Metadata = null)
{
    public Dictionary<string, object?> ToDictionary()
    {
        Dictionary<string, object?> payload = new(StringComparer.Ordinal);
        if (!string.IsNullOrWhiteSpace(Scheme))
        {
            payload["scheme"] = Scheme;
        }
        if (!string.IsNullOrWhiteSpace(Token))
        {
            payload["token"] = Token;
        }
        if (Headers is { Count: > 0 })
        {
            payload["headers"] = new Dictionary<string, string>(Headers, StringComparer.Ordinal);
        }
        if (Metadata is { Count: > 0 })
        {
            payload["metadata"] = new Dictionary<string, object?>(Metadata, StringComparer.Ordinal);
        }
        return payload;
    }
}

public sealed record ClientInfo(
    string Id,
    string Name,
    string? Description = null,
    string? Version = null,
    string? Platform = null,
    IReadOnlyDictionary<string, object?>? Metadata = null)
{
    public ClientInfo Apply(ClientInfoOverride? overrideInfo)
    {
        if (overrideInfo is null)
        {
            return this;
        }

        return this with
        {
            Id = overrideInfo.Id ?? Id,
            Name = overrideInfo.Name ?? Name,
            Description = overrideInfo.Description ?? Description,
            Version = overrideInfo.Version ?? Version,
            Platform = overrideInfo.Platform ?? Platform,
            Metadata = overrideInfo.Metadata ?? Metadata
        };
    }
}

public sealed class ClientInfoOverride
{
    public string? Id { get; init; }
    public string? Name { get; init; }
    public string? Description { get; init; }
    public string? Version { get; init; }
    public string? Platform { get; init; }
    public IReadOnlyDictionary<string, object?>? Metadata { get; init; }
}

public abstract class PathDescriptor
{
    protected PathDescriptor(string path)
    {
        Path = path;
    }

    public string Path { get; }

    public abstract string DescriptorType { get; }

    public abstract Dictionary<string, object?> ToDictionary();
}

public sealed class EndpointPathDescriptor : PathDescriptor
{
    public EndpointPathDescriptor(
        string path,
        HttpMethod method,
        string? description = null,
        IReadOnlyDictionary<string, object?>? inputSchema = null,
        IReadOnlyDictionary<string, object?>? outputSchema = null,
        string? contentType = null)
        : base(path)
    {
        Method = method;
        Description = description;
        InputSchema = inputSchema;
        OutputSchema = outputSchema;
        ContentType = contentType;
    }

    public HttpMethod Method { get; }

    public string? Description { get; }

    public IReadOnlyDictionary<string, object?>? InputSchema { get; }

    public IReadOnlyDictionary<string, object?>? OutputSchema { get; }

    public string? ContentType { get; }

    public override string DescriptorType => "endpoint";

    public override Dictionary<string, object?> ToDictionary()
    {
        Dictionary<string, object?> payload = new(StringComparer.Ordinal)
        {
            ["type"] = DescriptorType,
            ["path"] = Path,
            ["method"] = Method.ToString()
        };
        if (!string.IsNullOrWhiteSpace(Description))
        {
            payload["description"] = Description;
        }
        if (InputSchema is not null)
        {
            payload["inputSchema"] = new Dictionary<string, object?>(InputSchema, StringComparer.Ordinal);
        }
        if (OutputSchema is not null)
        {
            payload["outputSchema"] = new Dictionary<string, object?>(OutputSchema, StringComparer.Ordinal);
        }
        if (!string.IsNullOrWhiteSpace(ContentType))
        {
            payload["contentType"] = ContentType;
        }
        return payload;
    }
}

public sealed class SkillPathDescriptor : PathDescriptor
{
    public SkillPathDescriptor(string path, string? description = null, string? contentType = null)
        : base(path)
    {
        Description = description;
        ContentType = contentType;
    }

    public string? Description { get; }

    public string? ContentType { get; }

    public override string DescriptorType => "skill";

    public override Dictionary<string, object?> ToDictionary()
    {
        Dictionary<string, object?> payload = new(StringComparer.Ordinal)
        {
            ["type"] = DescriptorType,
            ["path"] = Path
        };
        if (!string.IsNullOrWhiteSpace(ContentType))
        {
            payload["contentType"] = ContentType;
        }
        if (!string.IsNullOrWhiteSpace(Description))
        {
            payload["description"] = Description;
        }
        return payload;
    }
}

public sealed class PromptPathDescriptor : PathDescriptor
{
    public PromptPathDescriptor(
        string path,
        string? description = null,
        IReadOnlyDictionary<string, object?>? inputSchema = null,
        IReadOnlyDictionary<string, object?>? outputSchema = null)
        : base(path)
    {
        Description = description;
        InputSchema = inputSchema;
        OutputSchema = outputSchema;
    }

    public string? Description { get; }

    public IReadOnlyDictionary<string, object?>? InputSchema { get; }

    public IReadOnlyDictionary<string, object?>? OutputSchema { get; }

    public override string DescriptorType => "prompt";

    public override Dictionary<string, object?> ToDictionary()
    {
        Dictionary<string, object?> payload = new(StringComparer.Ordinal)
        {
            ["type"] = DescriptorType,
            ["path"] = Path
        };
        if (!string.IsNullOrWhiteSpace(Description))
        {
            payload["description"] = Description;
        }
        if (InputSchema is not null)
        {
            payload["inputSchema"] = new Dictionary<string, object?>(InputSchema, StringComparer.Ordinal);
        }
        if (OutputSchema is not null)
        {
            payload["outputSchema"] = new Dictionary<string, object?>(OutputSchema, StringComparer.Ordinal);
        }
        return payload;
    }
}

public sealed class ClientDescriptor
{
    public ClientDescriptor(
        string id,
        string name,
        IReadOnlyList<PathDescriptor> paths,
        string? description = null,
        string? version = null,
        string? platform = null,
        IReadOnlyDictionary<string, object?>? metadata = null)
    {
        Id = id;
        Name = name;
        Paths = paths;
        Description = description;
        Version = version;
        Platform = platform;
        Metadata = metadata;
    }

    public string Id { get; }

    public string Name { get; }

    public IReadOnlyList<PathDescriptor> Paths { get; }

    public string? Description { get; }

    public string? Version { get; }

    public string? Platform { get; }

    public IReadOnlyDictionary<string, object?>? Metadata { get; }

    public Dictionary<string, object?> ToDictionary()
    {
        Dictionary<string, object?> payload = new(StringComparer.Ordinal)
        {
            ["id"] = Id,
            ["name"] = Name,
            ["paths"] = Paths.Select(path => path.ToDictionary()).ToList()
        };
        if (!string.IsNullOrWhiteSpace(Description))
        {
            payload["description"] = Description;
        }
        if (!string.IsNullOrWhiteSpace(Version))
        {
            payload["version"] = Version;
        }
        if (!string.IsNullOrWhiteSpace(Platform))
        {
            payload["platform"] = Platform;
        }
        if (Metadata is not null)
        {
            payload["metadata"] = new Dictionary<string, object?>(Metadata, StringComparer.Ordinal);
        }
        return payload;
    }
}

public sealed record SerializedError(string Code, string Message, object? Details = null)
{
    public Dictionary<string, object?> ToDictionary()
    {
        Dictionary<string, object?> payload = new(StringComparer.Ordinal)
        {
            ["code"] = Code,
            ["message"] = Message
        };
        if (Details is not null)
        {
            payload["details"] = Details;
        }
        return payload;
    }

    public static SerializedError Handler(string? message) =>
        new("handler_error", message ?? "Handler failed.");
}

public sealed record PathRequest(
    IReadOnlyDictionary<string, object?> Params,
    IReadOnlyDictionary<string, object?> Queries,
    object? Body,
    IReadOnlyDictionary<string, string> Headers);

public sealed record PathInvocationContext(
    string RequestId,
    string ClientId,
    string PathType,
    HttpMethod Method,
    string Path,
    AuthContext? Auth);

public sealed class EndpointOptions
{
    public string? Description { get; init; }
    public IReadOnlyDictionary<string, object?>? InputSchema { get; init; }
    public IReadOnlyDictionary<string, object?>? OutputSchema { get; init; }
    public string? ContentType { get; init; }
}

public sealed class SkillOptions
{
    public string? Description { get; init; }
    public string? ContentType { get; init; } = "text/markdown";
}

public sealed class PromptOptions
{
    public string? Description { get; init; }
    public IReadOnlyDictionary<string, object?>? InputSchema { get; init; }
    public IReadOnlyDictionary<string, object?>? OutputSchema { get; init; }
}
