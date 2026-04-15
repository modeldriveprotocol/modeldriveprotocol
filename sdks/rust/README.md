# `modeldriveprotocol-client`

Rust client SDK for Model Drive Protocol.

## Install

```toml
[dependencies]
modeldriveprotocol-client = "2.2.0"
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
```

## Quick start

```rust
use modeldriveprotocol_client::{ClientInfo, EndpointOptions, HttpMethod, MdpClient};
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = MdpClient::new(
        "ws://127.0.0.1:47372",
        ClientInfo::new("rust-01", "Rust Client"),
    )?;

    client.expose_endpoint(
        "/page/search",
        HttpMethod::Post,
        |_request, _context| async move { Ok(json!({"matches": 0})) },
        EndpointOptions::new().description("Search the current runtime"),
    )?;

    client.connect().await?;
    client.register(None).await?;
    Ok(())
}
```
