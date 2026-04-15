use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, RwLock};

use tokio::sync::{mpsc, Mutex};
use tokio::task::JoinHandle;
use url::Url;

use crate::error::MdpClientError;
use crate::models::{
    AuthContext, ClientDescriptor, ClientInfo, ClientInfoOverride, EndpointOptions, HttpMethod,
    PromptOptions, SkillOptions,
};
use crate::protocol::{CallClientRequest, ClientToServerMessage, ServerToClientMessage};
use crate::registry::ProcedureRegistry;
use crate::transport::{ClientTransport, HttpLoopClientTransport, WebSocketClientTransport};

pub struct MdpClient {
    inner: Arc<MdpClientInner>,
}

struct MdpClientInner {
    client_info: RwLock<ClientInfo>,
    auth: RwLock<Option<AuthContext>>,
    registry: RwLock<ProcedureRegistry>,
    transport: Mutex<Box<dyn ClientTransport>>,
    receive_task: Mutex<Option<JoinHandle<()>>>,
    connected: AtomicBool,
    registered: AtomicBool,
}

impl MdpClient {
    pub fn new(server_url: impl Into<String>, client: ClientInfo) -> Result<Self, MdpClientError> {
        let server_url = server_url.into();
        let url = Url::parse(&server_url).map_err(|error| MdpClientError::Transport(error.to_string()))?;
        let transport: Box<dyn ClientTransport> = match url.scheme() {
            "ws" | "wss" => Box::new(WebSocketClientTransport::new(server_url, None)),
            "http" | "https" => Box::new(HttpLoopClientTransport::new(server_url, None)),
            other => return Err(MdpClientError::Transport(format!("unsupported protocol `{other}`"))),
        };

        Ok(Self::with_transport(client, transport))
    }

    pub fn with_transport(client: ClientInfo, transport: Box<dyn ClientTransport>) -> Self {
        Self {
            inner: Arc::new(MdpClientInner {
                client_info: RwLock::new(client),
                auth: RwLock::new(None),
                registry: RwLock::new(ProcedureRegistry::default()),
                transport: Mutex::new(transport),
                receive_task: Mutex::new(None),
                connected: AtomicBool::new(false),
                registered: AtomicBool::new(false),
            }),
        }
    }

    pub fn set_auth(&self, auth: Option<AuthContext>) {
        *self.inner.auth.write().unwrap() = auth;
    }

    pub fn describe(&self) -> ClientDescriptor {
        let client_info = self.inner.client_info.read().unwrap().clone();
        self.inner.registry.read().unwrap().describe(&client_info)
    }

    pub fn expose_endpoint<H, Fut>(
        &self,
        path: impl Into<String>,
        method: HttpMethod,
        handler: H,
        options: EndpointOptions,
    ) -> Result<(), MdpClientError>
    where
        H: Send + Sync + 'static + Fn(crate::models::PathRequest, crate::models::PathInvocationContext) -> Fut,
        Fut: std::future::Future<Output = Result<serde_json::Value, MdpClientError>> + Send + 'static,
    {
        self.inner
            .registry
            .write()
            .unwrap()
            .expose_endpoint(path, method, handler, options)
    }

    pub fn expose_skill_markdown(
        &self,
        path: impl Into<String>,
        content: impl Into<String>,
        options: SkillOptions,
    ) -> Result<(), MdpClientError> {
        self.inner
            .registry
            .write()
            .unwrap()
            .expose_skill_markdown(path, content, options)
    }

    pub fn expose_prompt_markdown(
        &self,
        path: impl Into<String>,
        content: impl Into<String>,
        options: PromptOptions,
    ) -> Result<(), MdpClientError> {
        self.inner
            .registry
            .write()
            .unwrap()
            .expose_prompt_markdown(path, content, options)
    }

    pub async fn connect(&self) -> Result<(), MdpClientError> {
        let receiver = {
            let mut transport = self.inner.transport.lock().await;
            transport.connect().await?
        };
        self.inner.connected.store(true, Ordering::SeqCst);
        let inner = self.inner.clone();
        let task = tokio::spawn(async move {
            process_messages(inner, receiver).await;
        });
        *self.inner.receive_task.lock().await = Some(task);
        Ok(())
    }

    pub async fn register(
        &self,
        override_info: Option<ClientInfoOverride>,
    ) -> Result<(), MdpClientError> {
        if !self.inner.connected.load(Ordering::SeqCst) {
            return Err(MdpClientError::NotConnected);
        }

        {
            let current = self.inner.client_info.read().unwrap().clone();
            *self.inner.client_info.write().unwrap() = current.apply_override(override_info);
        }

        let descriptor = self.describe();
        let auth = self.inner.auth.read().unwrap().clone();
        self.send(ClientToServerMessage::RegisterClient {
            client: descriptor,
            auth,
        })
        .await?;
        self.inner.registered.store(true, Ordering::SeqCst);
        Ok(())
    }

    pub async fn sync_catalog(&self) -> Result<(), MdpClientError> {
        if !self.inner.connected.load(Ordering::SeqCst) {
            return Err(MdpClientError::NotConnected);
        }
        if !self.inner.registered.load(Ordering::SeqCst) {
            return Err(MdpClientError::NotRegistered);
        }

        let client_id = self.inner.client_info.read().unwrap().id.clone();
        let paths = self.inner.registry.read().unwrap().describe_paths();
        self.send(ClientToServerMessage::UpdateClientCatalog { client_id, paths })
            .await
    }

    pub async fn disconnect(&self) -> Result<(), MdpClientError> {
        if self.inner.connected.load(Ordering::SeqCst) && self.inner.registered.load(Ordering::SeqCst) {
            let client_id = self.inner.client_info.read().unwrap().id.clone();
            self.send(ClientToServerMessage::UnregisterClient { client_id }).await?;
        }
        self.inner.connected.store(false, Ordering::SeqCst);
        self.inner.registered.store(false, Ordering::SeqCst);
        {
            let mut transport = self.inner.transport.lock().await;
            transport.close().await?;
        }
        if let Some(task) = self.inner.receive_task.lock().await.take() {
            task.abort();
        }
        Ok(())
    }

    async fn send(&self, message: ClientToServerMessage) -> Result<(), MdpClientError> {
        let mut transport = self.inner.transport.lock().await;
        transport.send(message).await
    }
}

async fn process_messages(inner: Arc<MdpClientInner>, mut receiver: mpsc::UnboundedReceiver<ServerToClientMessage>) {
    while let Some(message) = receiver.recv().await {
        match message {
            ServerToClientMessage::Ping { timestamp } => {
                let mut transport = inner.transport.lock().await;
                let _ = transport.send(ClientToServerMessage::Pong { timestamp }).await;
            }
            ServerToClientMessage::Pong { .. } => {}
            ServerToClientMessage::CallClient(message) => {
                let result = handle_invocation(&inner, &message).await;
                let mut transport = inner.transport.lock().await;
                let _ = transport.send(result).await;
            }
        }
    }

    inner.connected.store(false, Ordering::SeqCst);
    inner.registered.store(false, Ordering::SeqCst);
}

async fn handle_invocation(
    inner: &Arc<MdpClientInner>,
    message: &CallClientRequest,
) -> ClientToServerMessage {
    let registry = inner.registry.read().unwrap().clone();
    match registry.invoke(message).await {
        Ok(data) => ClientToServerMessage::CallClientResult {
            request_id: message.request_id.clone(),
            ok: true,
            data: Some(data),
            error: None,
        },
        Err(error) => ClientToServerMessage::CallClientResult {
            request_id: message.request_id.clone(),
            ok: false,
            data: None,
            error: Some(crate::models::SerializedError::handler(error.to_string())),
        },
    }
}
