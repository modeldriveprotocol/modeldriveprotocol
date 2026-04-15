---
title: Quick Start
status: Draft
---

# Rust Quick Start

Use the Rust SDK when your MDP client runs in a service, CLI, daemon, or desktop runtime with `tokio`.

## 1. Add the crate

```toml
[dependencies]
modeldriveprotocol-client = "2.2.0"
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
serde_json = "1"
```

## 2. Create a client

```rust
use modeldriveprotocol_client::{ClientInfo, MdpClient};

let client = MdpClient::new(
    "ws://127.0.0.1:47372",
    ClientInfo::new("rust-01", "Rust Client"),
)?;
```

## 3. Expose one path

```rust
use modeldriveprotocol_client::{EndpointOptions, HttpMethod};
use serde_json::json;

client.expose_endpoint(
    "/page/search",
    HttpMethod::Post,
    |_request, _context| async move {
        Ok(json!({ "matches": 0 }))
    },
    EndpointOptions::new().description("Search the current runtime"),
)?;
```

## 4. Connect and register

```rust
client.connect().await?;
client.register(None).await?;
```

## Transport support

The Rust SDK currently supports:

- `ws` / `wss`
- `http` / `https` loop mode

For contributor workflow, debugging notes, and local crate validation, continue with [Rust SDK Guide](/contributing/modules/sdks/rust).
