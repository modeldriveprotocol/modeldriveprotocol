from modeldriveprotocol import ClientInfo, ProcedureRegistry


async def test_registry_describes_paths() -> None:
    registry = ProcedureRegistry()

    registry.expose_endpoint(
        "/goods",
        "GET",
        lambda _request, _context: {"list": [], "total": 0},
        description="List goods",
        input_schema={"type": "object"},
        output_schema={"type": "object"},
    )
    registry.expose_skill("/goods/skill.md", "# Goods\n\nRead `/goods` for the current goods list.")
    registry.expose_prompt(
        "/goods/prompt.md",
        lambda request, _context: {
            "messages": [{"role": "user", "content": f"Summarize page {request.queries.get('page', 1)}."}]
        },
        description="Build a goods summary prompt",
        input_schema={"type": "object"},
    )

    descriptor = registry.describe(ClientInfo(id="client-01", name="Protocol Test Client"))

    assert descriptor.to_dict()["paths"] == [
        {
            "type": "endpoint",
            "path": "/goods",
            "method": "GET",
            "description": "List goods",
            "inputSchema": {"type": "object"},
            "outputSchema": {"type": "object"},
        },
        {
            "type": "skill",
            "path": "/goods/skill.md",
            "description": "Read `/goods` for the current goods list.",
            "contentType": "text/markdown",
        },
        {
            "type": "prompt",
            "path": "/goods/prompt.md",
            "description": "Build a goods summary prompt",
            "inputSchema": {"type": "object"},
        },
    ]


async def test_registry_routes_requests_with_params_headers_and_auth() -> None:
    registry = ProcedureRegistry()

    async def handler(request, context):
        return {
            "id": request.params["id"],
            "page": request.queries["page"],
            "trace": request.headers["x-trace-id"],
            "authToken": context.auth.token,
        }

    registry.expose_endpoint("/goods/:id", "GET", handler)

    result = await registry.invoke(
        {
            "requestId": "req-01",
            "clientId": "client-01",
            "method": "GET",
            "path": "/goods/sku-01",
            "query": {"page": 3},
            "headers": {"x-trace-id": "trace-01"},
            "auth": {"token": "host-token"},
        }
    )

    assert result == {
        "id": "sku-01",
        "page": 3,
        "trace": "trace-01",
        "authToken": "host-token",
    }


async def test_registry_prefers_reserved_leaf_routes() -> None:
    registry = ProcedureRegistry()

    registry.expose_endpoint("/goods/:id", "GET", lambda request, _context: {"id": request.params["id"]})
    registry.expose_skill("/goods/skill.md", "# Goods Skill")

    result = await registry.invoke(
        {
            "requestId": "req-02",
            "clientId": "client-01",
            "method": "GET",
            "path": "/goods/skill.md",
        }
    )

    assert result == "# Goods Skill"
