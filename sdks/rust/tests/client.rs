use std::sync::Arc;

use async_trait::async_trait;
use modeldriveprotocol_client::{
    AuthContext, ClientInfo, ClientToServerMessage, ClientTransport, EndpointOptions, HttpMethod,
    MdpClient, MdpClientError, ServerToClientMessage,
};
use serde_json::json;
use tokio::sync::{mpsc, Mutex};

#[derive(Clone)]
struct FakeTransportHandle {
    sender: mpsc::UnboundedSender<ServerToClientMessage>,
    sent: Arc<Mutex<Vec<ClientToServerMessage>>>,
}

struct FakeTransport {
    receiver: Option<mpsc::UnboundedReceiver<ServerToClientMessage>>,
    sent: Arc<Mutex<Vec<ClientToServerMessage>>>,
}

impl FakeTransport {
    fn new() -> (Self, FakeTransportHandle) {
        let (sender, receiver) = mpsc::unbounded_channel();
        let sent = Arc::new(Mutex::new(Vec::new()));
        (
            Self {
                receiver: Some(receiver),
                sent: sent.clone(),
            },
            FakeTransportHandle { sender, sent },
        )
    }
}

#[async_trait]
impl ClientTransport for FakeTransport {
    async fn connect(
        &mut self,
    ) -> Result<mpsc::UnboundedReceiver<ServerToClientMessage>, MdpClientError> {
        Ok(self.receiver.take().unwrap())
    }

    async fn send(&mut self, message: ClientToServerMessage) -> Result<(), MdpClientError> {
        self.sent.lock().await.push(message);
        Ok(())
    }

    async fn close(&mut self) -> Result<(), MdpClientError> {
        Ok(())
    }
}

#[tokio::test]
async fn register_requires_connection() {
    let (transport, _handle) = FakeTransport::new();
    let client = MdpClient::with_transport(
        ClientInfo::new("rust-01", "Rust Client"),
        Box::new(transport),
    );

    let result = client.register(None).await;
    assert!(matches!(result, Err(MdpClientError::NotConnected)));
}

#[tokio::test]
async fn registers_paths_after_connect() {
    let (transport, handle) = FakeTransport::new();
    let client = MdpClient::with_transport(
        ClientInfo::new("rust-01", "Rust Client"),
        Box::new(transport),
    );
    client.set_auth(Some(AuthContext {
        scheme: Some("Bearer".to_string()),
        token: Some("client-token".to_string()),
        headers: None,
        metadata: None,
    }));
    client
        .expose_endpoint(
            "/goods",
            HttpMethod::Get,
            |_request, _context| async move { Ok(json!({"list": [], "total": 0})) },
            EndpointOptions::new().description("List goods"),
        )
        .unwrap();

    client.connect().await.unwrap();
    client.register(None).await.unwrap();

    let sent = handle.sent.lock().await.clone();
    assert_eq!(sent.len(), 1);
    assert!(matches!(sent[0], ClientToServerMessage::RegisterClient { .. }));
}

#[tokio::test]
async fn handles_ping_and_invocation_messages() {
    let (transport, handle) = FakeTransport::new();
    let client = MdpClient::with_transport(
        ClientInfo::new("rust-01", "Rust Client"),
        Box::new(transport),
    );
    client
        .expose_endpoint(
            "/goods/:id",
            HttpMethod::Get,
            |request, context| async move {
                Ok(json!({
                    "id": request.params.get("id"),
                    "page": request.queries.get("page"),
                    "authToken": context.auth.and_then(|auth| auth.token),
                }))
            },
            EndpointOptions::new(),
        )
        .unwrap();

    client.connect().await.unwrap();
    handle.sender.send(ServerToClientMessage::Ping { timestamp: 123 }).unwrap();
    handle
        .sender
        .send(ServerToClientMessage::from_value(json!({
            "type": "callClient",
            "requestId": "req-01",
            "clientId": "rust-01",
            "method": "GET",
            "path": "/goods/sku-01",
            "query": {"page": 2},
            "auth": {"token": "host-token"}
        }))
        .unwrap())
        .unwrap();

    tokio::time::sleep(std::time::Duration::from_millis(25)).await;

    let sent = handle.sent.lock().await.clone();
    assert_eq!(sent.len(), 2);
    assert!(matches!(sent[0], ClientToServerMessage::Pong { timestamp: 123 }));
    assert!(matches!(sent[1], ClientToServerMessage::CallClientResult { ok: true, .. }));
}
