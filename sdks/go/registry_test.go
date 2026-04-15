package mdp

import "testing"

func TestRegistryDescribesPaths(t *testing.T) {
	registry := NewProcedureRegistry()

	if err := registry.ExposeEndpoint(
		"/goods",
		HttpMethodGet,
		func(_ PathRequest, _ PathInvocationContext) (any, error) {
			return map[string]any{"list": []any{}, "total": 0}, nil
		},
		EndpointOptions{
			Description:  "List goods",
			InputSchema:  map[string]any{"type": "object"},
			OutputSchema: map[string]any{"type": "object"},
		},
	); err != nil {
		t.Fatal(err)
	}
	if err := registry.ExposeSkillMarkdown("/goods/skill.md", "# Goods\n\nRead `/goods` for the current goods list.", DefaultSkillOptions()); err != nil {
		t.Fatal(err)
	}
	if err := registry.ExposePromptMarkdown("/goods/prompt.md", "# Goods Prompt", PromptOptions{
		Description: "Build a goods summary prompt",
		InputSchema: map[string]any{"type": "object"},
	}); err != nil {
		t.Fatal(err)
	}

	descriptor := registry.Describe(ClientInfo{ID: "client-01", Name: "Go Client"})
	if len(descriptor.Paths) != 3 {
		t.Fatalf("expected 3 paths, got %d", len(descriptor.Paths))
	}
}

func TestRegistryRoutesRequestsWithParamsHeadersAndAuth(t *testing.T) {
	registry := NewProcedureRegistry()
	if err := registry.ExposeEndpoint(
		"/goods/:id",
		HttpMethodGet,
		func(request PathRequest, context PathInvocationContext) (any, error) {
			return map[string]any{
				"id":        request.Params["id"],
				"page":      request.Queries["page"],
				"trace":     request.Headers["x-trace-id"],
				"authToken": context.Auth.Token,
			}, nil
		},
		EndpointOptions{},
	); err != nil {
		t.Fatal(err)
	}

	result, err := registry.Invoke(CallClientMessage{
		RequestID: "req-01",
		ClientID:  "client-01",
		Method:    HttpMethodGet,
		Path:      "/goods/sku-01",
		Query:     map[string]any{"page": float64(3)},
		Headers:   map[string]string{"x-trace-id": "trace-01"},
		Auth:      &AuthContext{Token: "host-token"},
	})
	if err != nil {
		t.Fatal(err)
	}

	payload := result.(map[string]any)
	if payload["id"] != "sku-01" {
		t.Fatalf("unexpected id %#v", payload)
	}
}

func TestPathUtilities(t *testing.T) {
	if !IsPathPattern("/goods/:id") {
		t.Fatal("expected valid path pattern")
	}
	if !IsConcretePath("/goods/123") {
		t.Fatal("expected concrete path")
	}
	match := MatchPathPattern("/goods/:id", "/goods/sku-01")
	if match == nil || match.Params["id"] != "sku-01" {
		t.Fatalf("unexpected match %#v", match)
	}
	if ComparePathSpecificity([]int{2, 1}, []int{2, 0}) <= 0 {
		t.Fatal("expected left specificity to win")
	}
}

func TestUnexposeEndpointWithoutMethodRemovesByPath(t *testing.T) {
	registry := NewProcedureRegistry()
	if err := registry.ExposeEndpoint(
		"/goods",
		HttpMethodGet,
		func(_ PathRequest, _ PathInvocationContext) (any, error) {
			return map[string]any{"total": 0}, nil
		},
		EndpointOptions{},
	); err != nil {
		t.Fatal(err)
	}

	removed, err := registry.Unexpose("/goods", nil)
	if err != nil {
		t.Fatal(err)
	}
	if !removed {
		t.Fatal("expected endpoint to be removed when method is nil")
	}
	if len(registry.DescribePaths()) != 0 {
		t.Fatalf("expected registry to be empty, got %d paths", len(registry.DescribePaths()))
	}
}
