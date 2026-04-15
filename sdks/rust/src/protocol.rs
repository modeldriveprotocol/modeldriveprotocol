use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use crate::error::MdpClientError;
use crate::models::{AuthContext, ClientDescriptor, HttpMethod, SerializedError};
use crate::path_utils::is_concrete_path;

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(tag = "type")]
pub enum ClientToServerMessage {
    #[serde(rename = "registerClient")]
    RegisterClient {
        client: ClientDescriptor,
        #[serde(skip_serializing_if = "Option::is_none")]
        auth: Option<AuthContext>,
    },
    #[serde(rename = "updateClientCatalog")]
    UpdateClientCatalog {
        #[serde(rename = "clientId")]
        client_id: String,
        paths: Vec<crate::models::PathDescriptor>,
    },
    #[serde(rename = "unregisterClient")]
    UnregisterClient {
        #[serde(rename = "clientId")]
        client_id: String,
    },
    #[serde(rename = "callClientResult")]
    CallClientResult {
        #[serde(rename = "requestId")]
        request_id: String,
        ok: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        data: Option<Value>,
        #[serde(skip_serializing_if = "Option::is_none")]
        error: Option<SerializedError>,
    },
    #[serde(rename = "pong")]
    Pong { timestamp: i64 },
}

#[derive(Clone, Debug, PartialEq)]
pub enum ServerToClientMessage {
    CallClient(CallClientRequest),
    Ping { timestamp: i64 },
    Pong { timestamp: i64 },
}

#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CallClientRequest {
    pub request_id: String,
    pub client_id: String,
    pub method: HttpMethod,
    pub path: String,
    pub params: Option<Map<String, Value>>,
    pub query: Option<Map<String, Value>>,
    pub body: Option<Value>,
    pub headers: Option<std::collections::HashMap<String, String>>,
    pub auth: Option<AuthContext>,
}

impl ServerToClientMessage {
    pub fn from_text(raw: &str) -> Result<Self, MdpClientError> {
        let value: Value = serde_json::from_str(raw)?;
        Self::from_value(value)
    }

    pub fn from_value(value: Value) -> Result<Self, MdpClientError> {
        let object = value
            .as_object()
            .ok_or_else(|| MdpClientError::Protocol("invalid MDP message payload".to_string()))?;

        let message_type = object
            .get("type")
            .and_then(Value::as_str)
            .ok_or_else(|| MdpClientError::Protocol("missing message type".to_string()))?;

        match message_type {
            "ping" => Ok(Self::Ping {
                timestamp: object
                    .get("timestamp")
                    .and_then(Value::as_i64)
                    .ok_or_else(|| MdpClientError::Protocol("invalid ping payload".to_string()))?,
            }),
            "pong" => Ok(Self::Pong {
                timestamp: object
                    .get("timestamp")
                    .and_then(Value::as_i64)
                    .ok_or_else(|| MdpClientError::Protocol("invalid pong payload".to_string()))?,
            }),
            "callClient" => {
                let request: CallClientRequest = serde_json::from_value(value)?;
                if !is_concrete_path(&request.path) {
                    return Err(MdpClientError::Protocol("invalid callClient path".to_string()));
                }
                Ok(Self::CallClient(request))
            }
            other => Err(MdpClientError::Protocol(format!(
                "unsupported server message type `{other}`"
            ))),
        }
    }
}
