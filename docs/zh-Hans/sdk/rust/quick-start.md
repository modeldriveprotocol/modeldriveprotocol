---
title: 简易上手
status: Draft
---

# Rust SDK / 简易上手

当你的 MDP client 运行在服务、CLI、守护进程或基于 `tokio` 的桌面运行时里时，使用 Rust SDK。

## 1. 添加 crate

```toml
[dependencies]
modeldriveprotocol-client = "2.2.0"
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
serde_json = "1"
```

## 2. 创建 client

```rust
use modeldriveprotocol_client::{ClientInfo, MdpClient};

let client = MdpClient::new(
    "ws://127.0.0.1:47372",
    ClientInfo::new("rust-01", "Rust Client"),
)?;
```

## 3. 暴露一个路径

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

## 4. 连接并注册

```rust
client.connect().await?;
client.register(None).await?;
```

## 当前 transport 支持

Rust SDK 当前支持：

- `ws` / `wss`
- `http` / `https` loop mode

如果你要看维护者视角的开发、调试和本地验证流程，继续阅读 [Rust SDK 开发指南](/zh-Hans/contributing/modules/sdks/rust)。
