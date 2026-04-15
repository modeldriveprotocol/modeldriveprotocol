namespace ModelDriveProtocol.Client;

public delegate Task<object?> PathHandler(PathRequest request, PathInvocationContext context);

public sealed class ProcedureRegistry
{
    private readonly object gate = new();
    private readonly List<Registration> entries = [];

    public void ExposeEndpoint(
        string path,
        HttpMethod method,
        PathHandler handler,
        EndpointOptions? options = null)
    {
        options ??= new EndpointOptions();
        Register(
            new EndpointPathDescriptor(
                path,
                method,
                options.Description,
                options.InputSchema,
                options.OutputSchema,
                options.ContentType),
            handler);
    }

    public void ExposeSkillMarkdown(string path, string content, SkillOptions? options = null)
    {
        options ??= new SkillOptions();
        string description = !string.IsNullOrWhiteSpace(options.Description)
            ? options.Description
            : DeriveMarkdownDescription(content);
        Register(
            new SkillPathDescriptor(path, description, options.ContentType ?? "text/markdown"),
            (_request, _context) => Task.FromResult<object?>(content));
    }

    public void ExposePromptMarkdown(string path, string content, PromptOptions? options = null)
    {
        options ??= new PromptOptions();
        string description = !string.IsNullOrWhiteSpace(options.Description)
            ? options.Description
            : DeriveMarkdownDescription(content);
        Register(
            new PromptPathDescriptor(path, description, options.InputSchema, options.OutputSchema),
            (_request, _context) => Task.FromResult<object?>(
                new Dictionary<string, object?>(StringComparer.Ordinal)
                {
                    ["messages"] = new List<Dictionary<string, object?>>
                    {
                        new(StringComparer.Ordinal)
                        {
                            ["role"] = "user",
                            ["content"] = content
                        }
                    }
                }));
    }

    public bool Unexpose(string path, HttpMethod? method = null)
    {
        if (!PathUtils.IsPathPattern(path))
        {
            throw new ArgumentException($"Invalid path '{path}'.", nameof(path));
        }

        lock (gate)
        {
            for (int index = 0; index < entries.Count; index += 1)
            {
                Registration current = entries[index];
                if (!string.Equals(current.Descriptor.Path, path, StringComparison.Ordinal))
                {
                    continue;
                }

                if (current.Descriptor is EndpointPathDescriptor endpoint && method is not null && endpoint.Method != method)
                {
                    continue;
                }

                entries.RemoveAt(index);
                return true;
            }
        }

        return false;
    }

    public IReadOnlyList<PathDescriptor> DescribePaths()
    {
        lock (gate)
        {
            return entries.Select(entry => entry.Descriptor).ToList();
        }
    }

    public ClientDescriptor Describe(ClientInfo clientInfo) =>
        new(
            clientInfo.Id,
            clientInfo.Name,
            DescribePaths(),
            clientInfo.Description,
            clientInfo.Version,
            clientInfo.Platform,
            clientInfo.Metadata);

    public async Task<object?> InvokeAsync(CallClientMessage message)
    {
        ResolvedRegistration? entry = ResolveEntry(message.Method, message.Path);
        if (entry is null)
        {
            throw new InvalidOperationException($"Unknown path '{message.Path}' for method '{message.Method}'.");
        }

        return await entry.Handler(
            new PathRequest(
                CloneObjectDictionary(entry.Parameters),
                CloneObjectDictionary(message.Query),
                message.Body,
                CloneStringDictionary(message.Headers)),
            new PathInvocationContext(
                message.RequestId,
                message.ClientId,
                entry.Descriptor.DescriptorType,
                message.Method,
                message.Path,
                message.Auth));
    }

    private void Register(PathDescriptor descriptor, PathHandler handler)
    {
        ArgumentNullException.ThrowIfNull(handler);
        if (!PathUtils.IsPathPattern(descriptor.Path))
        {
            throw new ArgumentException($"Invalid path '{descriptor.Path}'.", nameof(descriptor));
        }
        AssertDescriptorPathShape(descriptor);

        string key = RegistrationKey(descriptor);
        Registration entry = new(descriptor, handler);

        lock (gate)
        {
            for (int index = 0; index < entries.Count; index += 1)
            {
                if (string.Equals(RegistrationKey(entries[index].Descriptor), key, StringComparison.Ordinal))
                {
                    entries[index] = entry;
                    return;
                }
            }
            entries.Add(entry);
        }
    }

    private ResolvedRegistration? ResolveEntry(HttpMethod method, string path)
    {
        lock (gate)
        {
            ResolvedRegistration? bestMatch = null;
            foreach (Registration entry in entries)
            {
                if (!MatchesMethod(entry.Descriptor, method))
                {
                    continue;
                }

                PathPatternMatch? match = PathUtils.MatchPathPattern(entry.Descriptor.Path, path);
                if (match is null)
                {
                    continue;
                }

                if (bestMatch is null || PathUtils.ComparePathSpecificity(match.Specificity, bestMatch.Specificity) > 0)
                {
                    bestMatch = new ResolvedRegistration(
                        entry.Descriptor,
                        entry.Handler,
                        CloneObjectDictionary(match.Params),
                        match.Specificity.ToArray());
                }
            }

            return bestMatch;
        }
    }

    private static void AssertDescriptorPathShape(PathDescriptor descriptor)
    {
        string path = descriptor.Path;
        switch (descriptor)
        {
            case EndpointPathDescriptor:
                if (PathUtils.IsSkillPath(path) || PathUtils.IsPromptPath(path))
                {
                    throw new InvalidOperationException("Endpoint path cannot target reserved skill or prompt leaves.");
                }
                break;
            case SkillPathDescriptor:
                if (!PathUtils.IsSkillPath(path))
                {
                    throw new InvalidOperationException("Skill paths must end with skill.md or SKILL.md.");
                }
                break;
            case PromptPathDescriptor:
                if (!PathUtils.IsPromptPath(path))
                {
                    throw new InvalidOperationException("Prompt paths must end with prompt.md or PROMPT.md.");
                }
                break;
        }
    }

    private static string DeriveMarkdownDescription(string content)
    {
        List<string> paragraph = [];
        foreach (string rawLine in content.Split('\n'))
        {
            string line = rawLine.Trim();
            if (line.Length == 0)
            {
                if (paragraph.Count > 0)
                {
                    break;
                }
                continue;
            }
            paragraph.Add(line.TrimStart('#', ' '));
        }

        return paragraph.Count > 0 ? string.Join(' ', paragraph) : "Markdown path";
    }

    private static string RegistrationKey(PathDescriptor descriptor) =>
        descriptor is EndpointPathDescriptor endpoint
            ? $"{endpoint.Method} {endpoint.Path}"
            : descriptor.Path;

    private static bool MatchesMethod(PathDescriptor descriptor, HttpMethod method) =>
        descriptor is EndpointPathDescriptor endpoint ? endpoint.Method == method : method == HttpMethod.GET;

    private static Dictionary<string, object?> CloneObjectDictionary(IReadOnlyDictionary<string, object?> source) =>
        new(source, StringComparer.Ordinal);

    private static Dictionary<string, string> CloneStringDictionary(IReadOnlyDictionary<string, string> source) =>
        new(source, StringComparer.Ordinal);

    private sealed record Registration(PathDescriptor Descriptor, PathHandler Handler);

    private sealed record ResolvedRegistration(
        PathDescriptor Descriptor,
        PathHandler Handler,
        IReadOnlyDictionary<string, object?> Parameters,
        IReadOnlyList<int> Specificity);
}
