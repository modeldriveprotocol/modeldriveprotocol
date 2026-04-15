use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

pub type JsonSchema = Map<String, Value>;
pub type RpcArguments = Map<String, Value>;

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct AuthContext {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scheme: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub headers: Option<std::collections::HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Map<String, Value>>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ClientInfo {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Map<String, Value>>,
}

impl ClientInfo {
    pub fn new(id: impl Into<String>, name: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            description: None,
            version: None,
            platform: None,
            metadata: None,
        }
    }

    pub fn apply_override(&self, override_info: Option<ClientInfoOverride>) -> Self {
        match override_info {
            None => self.clone(),
            Some(override_info) => Self {
                id: override_info.id.unwrap_or_else(|| self.id.clone()),
                name: override_info.name.unwrap_or_else(|| self.name.clone()),
                description: override_info.description.or_else(|| self.description.clone()),
                version: override_info.version.or_else(|| self.version.clone()),
                platform: override_info.platform.or_else(|| self.platform.clone()),
                metadata: override_info.metadata.or_else(|| self.metadata.clone()),
            },
        }
    }
}

#[derive(Clone, Debug, Default)]
pub struct ClientInfoOverride {
    pub id: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub platform: Option<String>,
    pub metadata: Option<Map<String, Value>>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum HttpMethod {
    #[serde(rename = "GET")]
    Get,
    #[serde(rename = "POST")]
    Post,
    #[serde(rename = "PUT")]
    Put,
    #[serde(rename = "PATCH")]
    Patch,
    #[serde(rename = "DELETE")]
    Delete,
}

impl HttpMethod {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Get => "GET",
            Self::Post => "POST",
            Self::Put => "PUT",
            Self::Patch => "PATCH",
            Self::Delete => "DELETE",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum PathDescriptor {
    #[serde(rename = "endpoint")]
    Endpoint {
        path: String,
        method: HttpMethod,
        #[serde(skip_serializing_if = "Option::is_none")]
        description: Option<String>,
        #[serde(rename = "inputSchema", skip_serializing_if = "Option::is_none")]
        input_schema: Option<JsonSchema>,
        #[serde(rename = "outputSchema", skip_serializing_if = "Option::is_none")]
        output_schema: Option<JsonSchema>,
        #[serde(rename = "contentType", skip_serializing_if = "Option::is_none")]
        content_type: Option<String>,
    },
    #[serde(rename = "skill")]
    Skill {
        path: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        description: Option<String>,
        #[serde(rename = "contentType")]
        content_type: String,
    },
    #[serde(rename = "prompt")]
    Prompt {
        path: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        description: Option<String>,
        #[serde(rename = "inputSchema", skip_serializing_if = "Option::is_none")]
        input_schema: Option<JsonSchema>,
        #[serde(rename = "outputSchema", skip_serializing_if = "Option::is_none")]
        output_schema: Option<JsonSchema>,
    },
}

impl PathDescriptor {
    pub fn path(&self) -> &str {
        match self {
            Self::Endpoint { path, .. } | Self::Skill { path, .. } | Self::Prompt { path, .. } => path,
        }
    }

    pub fn descriptor_type(&self) -> &'static str {
        match self {
            Self::Endpoint { .. } => "endpoint",
            Self::Skill { .. } => "skill",
            Self::Prompt { .. } => "prompt",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ClientDescriptor {
    pub id: String,
    pub name: String,
    pub paths: Vec<PathDescriptor>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Map<String, Value>>,
}

impl ClientDescriptor {
    pub fn from_info(info: &ClientInfo, paths: Vec<PathDescriptor>) -> Self {
        Self {
            id: info.id.clone(),
            name: info.name.clone(),
            description: info.description.clone(),
            version: info.version.clone(),
            platform: info.platform.clone(),
            metadata: info.metadata.clone(),
            paths,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct SerializedError {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<Value>,
}

impl SerializedError {
    pub fn handler(message: impl Into<String>) -> Self {
        Self {
            code: "handler_error".to_string(),
            message: message.into(),
            details: None,
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct PathRequest {
    pub params: RpcArguments,
    pub queries: RpcArguments,
    pub body: Option<Value>,
    pub headers: std::collections::HashMap<String, String>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct PathInvocationContext {
    pub request_id: String,
    pub client_id: String,
    pub path_type: String,
    pub method: HttpMethod,
    pub path: String,
    pub auth: Option<AuthContext>,
}

#[derive(Clone, Debug, Default)]
pub struct EndpointOptions {
    pub description: Option<String>,
    pub input_schema: Option<JsonSchema>,
    pub output_schema: Option<JsonSchema>,
    pub content_type: Option<String>,
}

impl EndpointOptions {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn description(mut self, description: impl Into<String>) -> Self {
        self.description = Some(description.into());
        self
    }
}

#[derive(Clone, Debug)]
pub struct SkillOptions {
    pub description: Option<String>,
    pub content_type: String,
}

impl Default for SkillOptions {
    fn default() -> Self {
        Self {
            description: None,
            content_type: "text/markdown".to_string(),
        }
    }
}

impl SkillOptions {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn description(mut self, description: impl Into<String>) -> Self {
        self.description = Some(description.into());
        self
    }
}

#[derive(Clone, Debug, Default)]
pub struct PromptOptions {
    pub description: Option<String>,
    pub input_schema: Option<JsonSchema>,
    pub output_schema: Option<JsonSchema>,
}

impl PromptOptions {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn description(mut self, description: impl Into<String>) -> Self {
        self.description = Some(description.into());
        self
    }
}
