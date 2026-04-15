use modeldriveprotocol_client::{
    compare_path_specificity, is_concrete_path, is_path_pattern, match_path_pattern, ClientInfo,
    EndpointOptions, HttpMethod, ProcedureRegistry, PromptOptions, SkillOptions,
};
use serde_json::json;

#[tokio::test]
async fn describes_exposed_paths() {
    let mut registry = ProcedureRegistry::default();

    registry
        .expose_endpoint(
            "/goods",
            HttpMethod::Get,
            |_request, _context| async move { Ok(json!({"list": [], "total": 0})) },
            EndpointOptions::new().description("List goods"),
        )
        .unwrap();
    registry
        .expose_skill_markdown(
            "/goods/skill.md",
            "# Goods\n\nRead `/goods` for the current goods list.",
            SkillOptions::new(),
        )
        .unwrap();
    registry
        .expose_prompt_markdown(
            "/goods/prompt.md",
            "# Goods Prompt",
            PromptOptions::new().description("Build a goods summary prompt"),
        )
        .unwrap();

    let descriptor = registry.describe(&ClientInfo::new("client-01", "Rust Client"));
    assert_eq!(descriptor.paths.len(), 3);
}

#[tokio::test]
async fn routes_requests_with_params_headers_and_auth() {
    let mut registry = ProcedureRegistry::default();

    registry
        .expose_endpoint(
            "/goods/:id",
            HttpMethod::Get,
            |request, context| async move {
                Ok(json!({
                    "id": request.params.get("id"),
                    "page": request.queries.get("page"),
                    "trace": request.headers.get("x-trace-id"),
                    "authToken": context.auth.and_then(|auth| auth.token),
                }))
            },
            EndpointOptions::new(),
        )
        .unwrap();

    let result = registry
        .invoke(&serde_json::from_value(json!({
            "requestId": "req-01",
            "clientId": "client-01",
            "method": "GET",
            "path": "/goods/sku-01",
            "query": {"page": 3},
            "headers": {"x-trace-id": "trace-01"},
            "auth": {"token": "host-token"}
        }))
        .unwrap())
        .await
        .unwrap();

    assert_eq!(
        result,
        json!({
            "id": "sku-01",
            "page": 3,
            "trace": "trace-01",
            "authToken": "host-token"
        })
    );
}

#[test]
fn validates_paths_and_specificity() {
    assert!(is_path_pattern("/goods/:id"));
    assert!(is_concrete_path("/goods/123"));
    assert_eq!(
        match_path_pattern("/goods/:id", "/goods/sku-01")
            .unwrap()
            .params
            .get("id")
            .unwrap(),
        "sku-01"
    );
    assert!(compare_path_specificity(&[2, 1], &[2, 0]) > 0);
}
