use std::collections::HashMap;

use async_trait::async_trait;
use futures_util::{SinkExt, StreamExt};
use http::Request;
use serde_json::{json, Value};
use tokio::sync::mpsc;
use tokio::task::JoinHandle;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;

use crate::error::MdpClientError;
use crate::protocol::{ClientToServerMessage, ServerToClientMessage};

const DEFAULT_HTTP_LOOP_PATH: &str = "/mdp/http-loop";
const SESSION_HEADER: &str = "x-mdp-session-id";

#[async_trait]
pub trait ClientTransport: Send {
    async fn connect(
        &mut self,
    ) -> Result<mpsc::UnboundedReceiver<ServerToClientMessage>, MdpClientError>;
    async fn send(&mut self, message: ClientToServerMessage) -> Result<(), MdpClientError>;
    async fn close(&mut self) -> Result<(), MdpClientError>;
}

pub struct WebSocketClientTransport {
    server_url: String,
    headers: HashMap<String, String>,
    writer: Option<
        futures_util::stream::SplitSink<
            tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>,
            Message,
        >,
    >,
    read_task: Option<JoinHandle<()>>,
}

impl WebSocketClientTransport {
    pub fn new(server_url: impl Into<String>, headers: Option<HashMap<String, String>>) -> Self {
        Self {
            server_url: server_url.into(),
            headers: headers.unwrap_or_default(),
            writer: None,
            read_task: None,
        }
    }
}

#[async_trait]
impl ClientTransport for WebSocketClientTransport {
    async fn connect(
        &mut self,
    ) -> Result<mpsc::UnboundedReceiver<ServerToClientMessage>, MdpClientError> {
        let mut request = Request::builder().uri(&self.server_url);
        for (key, value) in &self.headers {
            request = request.header(key, value);
        }
        let request = request
            .body(())
            .map_err(|error| MdpClientError::Transport(error.to_string()))?;

        let (stream, _) = connect_async(request).await?;
        let (writer, mut reader) = stream.split();
        self.writer = Some(writer);

        let (sender, receiver) = mpsc::unbounded_channel();
        self.read_task = Some(tokio::spawn(async move {
            while let Some(frame) = reader.next().await {
                let Ok(frame) = frame else {
                    break;
                };

                match frame {
                    Message::Text(text) => {
                        let Ok(message) = ServerToClientMessage::from_text(&text) else {
                            continue;
                        };
                        if sender.send(message).is_err() {
                            break;
                        }
                    }
                    Message::Binary(payload) => {
                        let Ok(text) = String::from_utf8(payload.to_vec()) else {
                            continue;
                        };
                        let Ok(message) = ServerToClientMessage::from_text(&text) else {
                            continue;
                        };
                        if sender.send(message).is_err() {
                            break;
                        }
                    }
                    Message::Close(_) => break,
                    _ => continue,
                }
            }
        }));

        Ok(receiver)
    }

    async fn send(&mut self, message: ClientToServerMessage) -> Result<(), MdpClientError> {
        let Some(writer) = &mut self.writer else {
            return Err(MdpClientError::NotConnected);
        };
        writer
            .send(Message::Text(serde_json::to_string(&message)?.into()))
            .await?;
        Ok(())
    }

    async fn close(&mut self) -> Result<(), MdpClientError> {
        if let Some(writer) = &mut self.writer {
            writer.close().await?;
        }
        self.writer = None;
        if let Some(task) = self.read_task.take() {
            task.abort();
        }
        Ok(())
    }
}

pub struct HttpLoopClientTransport {
    server_url: String,
    endpoint_path: String,
    headers: HashMap<String, String>,
    poll_wait_ms: u64,
    client: reqwest::Client,
    session_id: Option<String>,
    poll_task: Option<JoinHandle<()>>,
}

impl HttpLoopClientTransport {
    pub fn new(server_url: impl Into<String>, headers: Option<HashMap<String, String>>) -> Self {
        Self {
            server_url: server_url.into(),
            endpoint_path: DEFAULT_HTTP_LOOP_PATH.to_string(),
            headers: headers.unwrap_or_default(),
            poll_wait_ms: 25_000,
            client: reqwest::Client::new(),
            session_id: None,
            poll_task: None,
        }
    }

    fn endpoint_url(&self, suffix: &str) -> String {
        format!(
            "{}{}{}",
            self.server_url.trim_end_matches('/'),
            self.endpoint_path,
            suffix
        )
    }
}

#[async_trait]
impl ClientTransport for HttpLoopClientTransport {
    async fn connect(
        &mut self,
    ) -> Result<mpsc::UnboundedReceiver<ServerToClientMessage>, MdpClientError> {
        let response = self
            .client
            .post(self.endpoint_url("/connect"))
            .headers(reqwest::header::HeaderMap::new())
            .json(&json!({}))
            .send()
            .await?;
        let response = response.error_for_status()?;
        let payload: Value = response.json().await?;
        let session_id = payload
            .get("sessionId")
            .and_then(Value::as_str)
            .ok_or_else(|| MdpClientError::Protocol("invalid HTTP loop handshake response".to_string()))?
            .to_string();

        self.session_id = Some(session_id.clone());
        let client = self.client.clone();
        let base_url = self.server_url.clone();
        let endpoint_path = self.endpoint_path.clone();
        let wait_ms = self.poll_wait_ms;
        let headers = self.headers.clone();

        let (sender, receiver) = mpsc::unbounded_channel();
        self.poll_task = Some(tokio::spawn(async move {
            loop {
                let response = client
                    .get(format!(
                        "{}{}{}",
                        base_url.trim_end_matches('/'),
                        endpoint_path,
                        "/poll"
                    ))
                    .headers(headers_to_reqwest(&headers))
                    .query(&[("sessionId", session_id.as_str()), ("waitMs", &wait_ms.to_string())])
                    .send()
                    .await;

                let Ok(response) = response else {
                    break;
                };

                if response.status() == reqwest::StatusCode::NO_CONTENT {
                    continue;
                }

                let Ok(response) = response.error_for_status() else {
                    break;
                };

                let Ok(payload) = response.json::<Value>().await else {
                    break;
                };

                let Some(message) = payload.get("message").cloned() else {
                    continue;
                };

                let Ok(message) = ServerToClientMessage::from_value(message) else {
                    continue;
                };

                if sender.send(message).is_err() {
                    break;
                }
            }
        }));

        Ok(receiver)
    }

    async fn send(&mut self, message: ClientToServerMessage) -> Result<(), MdpClientError> {
        let Some(session_id) = &self.session_id else {
            return Err(MdpClientError::NotConnected);
        };
        self.client
            .post(self.endpoint_url("/send"))
            .headers(headers_to_reqwest(&self.headers))
            .header(SESSION_HEADER, session_id)
            .json(&json!({ "message": message }))
            .send()
            .await?
            .error_for_status()?;
        Ok(())
    }

    async fn close(&mut self) -> Result<(), MdpClientError> {
        if let Some(task) = self.poll_task.take() {
            task.abort();
        }
        if let Some(session_id) = self.session_id.take() {
            let _ = self
                .client
                .post(self.endpoint_url("/disconnect"))
                .headers(headers_to_reqwest(&self.headers))
                .header(SESSION_HEADER, session_id)
                .json(&json!({}))
                .send()
                .await;
        }
        Ok(())
    }
}

fn headers_to_reqwest(headers: &HashMap<String, String>) -> reqwest::header::HeaderMap {
    let mut map = reqwest::header::HeaderMap::new();
    for (key, value) in headers {
        if let (Ok(name), Ok(value)) = (
            reqwest::header::HeaderName::from_bytes(key.as_bytes()),
            reqwest::header::HeaderValue::from_str(value),
        ) {
            map.insert(name, value);
        }
    }
    map
}
