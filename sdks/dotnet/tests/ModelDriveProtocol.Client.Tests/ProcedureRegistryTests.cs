using ModelDriveProtocol.Client;
using Xunit;

namespace ModelDriveProtocol.Client.Tests;

public sealed class ProcedureRegistryTests
{
    [Fact]
    public void RegistryDescribesPaths()
    {
        ProcedureRegistry registry = new();

        registry.ExposeEndpoint(
            "/goods",
            HttpMethod.GET,
            (_request, _context) => Task.FromResult<object?>(
                new Dictionary<string, object?> { ["list"] = Array.Empty<object>(), ["total"] = 0 }),
            new EndpointOptions
            {
                Description = "List goods",
                InputSchema = new Dictionary<string, object?> { ["type"] = "object" },
                OutputSchema = new Dictionary<string, object?> { ["type"] = "object" }
            });
        registry.ExposeSkillMarkdown("/goods/skill.md", "# Goods\n\nRead `/goods` for the current goods list.");
        registry.ExposePromptMarkdown(
            "/goods/prompt.md",
            "# Goods Prompt",
            new PromptOptions
            {
                Description = "Build a goods summary prompt",
                InputSchema = new Dictionary<string, object?> { ["type"] = "object" }
            });

        ClientDescriptor descriptor = registry.Describe(new ClientInfo("client-01", "C# Client"));

        Assert.Equal(3, descriptor.Paths.Count);
    }

    [Fact]
    public async Task RegistryRoutesRequestsWithParamsHeadersAndAuth()
    {
        ProcedureRegistry registry = new();
        registry.ExposeEndpoint(
            "/goods/:id",
            HttpMethod.GET,
            (request, context) => Task.FromResult<object?>(
                new Dictionary<string, object?>
                {
                    ["id"] = request.Params["id"],
                    ["page"] = request.Queries["page"],
                    ["trace"] = request.Headers["x-trace-id"],
                    ["authToken"] = context.Auth?.Token
                }),
            new EndpointOptions());

        object? result = await registry.InvokeAsync(new CallClientMessage(
            "req-01",
            "client-01",
            HttpMethod.GET,
            "/goods/sku-01",
            new Dictionary<string, object?>(),
            new Dictionary<string, object?> { ["page"] = 3L },
            null,
            new Dictionary<string, string> { ["x-trace-id"] = "trace-01" },
            new AuthContext(Token: "host-token")));

        Dictionary<string, object?> payload = Assert.IsType<Dictionary<string, object?>>(result);
        Assert.Equal("sku-01", payload["id"]);
    }

    [Fact]
    public void PathUtilitiesWork()
    {
        Assert.True(PathUtils.IsPathPattern("/goods/:id"));
        Assert.True(PathUtils.IsConcretePath("/goods/123"));
        Assert.False(PathUtils.IsConcretePath("/goods/"));
        Assert.False(PathUtils.IsConcretePath("/goods//sku"));

        PathPatternMatch? match = PathUtils.MatchPathPattern("/goods/:id", "/goods/sku-01");

        Assert.NotNull(match);
        Assert.Equal("sku-01", match!.Params["id"]);
        Assert.True(PathUtils.ComparePathSpecificity([2, 1], [2, 0]) > 0);
    }
}
