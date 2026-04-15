use thiserror::Error;

#[derive(Debug, Error)]
pub enum MdpClientError {
    #[error("transport error: {0}")]
    Transport(String),
    #[error("protocol error: {0}")]
    Protocol(String),
    #[error("invalid path: {0}")]
    InvalidPath(String),
    #[error("MDP client is not connected")]
    NotConnected,
    #[error("MDP client is not registered")]
    NotRegistered,
    #[error("unknown path `{path}` for method `{method}`")]
    UnknownPath { path: String, method: String },
    #[error("handler error: {0}")]
    Handler(String),
}

impl From<serde_json::Error> for MdpClientError {
    fn from(value: serde_json::Error) -> Self {
        Self::Protocol(value.to_string())
    }
}

impl From<reqwest::Error> for MdpClientError {
    fn from(value: reqwest::Error) -> Self {
        Self::Transport(value.to_string())
    }
}

impl From<tokio_tungstenite::tungstenite::Error> for MdpClientError {
    fn from(value: tokio_tungstenite::tungstenite::Error) -> Self {
        Self::Transport(value.to_string())
    }
}
