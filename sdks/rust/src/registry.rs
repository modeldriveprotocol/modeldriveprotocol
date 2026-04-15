use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use async_trait::async_trait;
use serde_json::{json, Map, Value};

use crate::error::MdpClientError;
use crate::models::{
    ClientDescriptor, ClientInfo, EndpointOptions, HttpMethod, PathDescriptor, PathInvocationContext,
    PathRequest, PromptOptions, SkillOptions,
};
use crate::path_utils::{
    compare_path_specificity, is_path_pattern, is_prompt_path, is_skill_path, match_path_pattern,
};
use crate::protocol::CallClientRequest;

type HandlerFuture = Pin<Box<dyn Future<Output = Result<Value, MdpClientError>> + Send>>;

#[async_trait]
pub trait PathHandler: Send + Sync {
    async fn handle(
        &self,
        request: PathRequest,
        context: PathInvocationContext,
    ) -> Result<Value, MdpClientError>;
}

#[async_trait]
impl<F, Fut> PathHandler for F
where
    F: Send + Sync + 'static + Fn(PathRequest, PathInvocationContext) -> Fut,
    Fut: Future<Output = Result<Value, MdpClientError>> + Send + 'static,
{
    async fn handle(
        &self,
        request: PathRequest,
        context: PathInvocationContext,
    ) -> Result<Value, MdpClientError> {
        (self)(request, context).await
    }
}

#[derive(Clone)]
struct ProcedureEntry {
    descriptor: PathDescriptor,
    handler: Arc<dyn PathHandler>,
}

#[derive(Clone)]
struct ResolvedProcedure {
    descriptor: PathDescriptor,
    handler: Arc<dyn PathHandler>,
    params: Map<String, Value>,
    specificity: Vec<i32>,
}

#[derive(Default, Clone)]
pub struct ProcedureRegistry {
    entries: Vec<ProcedureEntry>,
}

impl ProcedureRegistry {
    pub fn expose_endpoint<H, Fut>(
        &mut self,
        path: impl Into<String>,
        method: HttpMethod,
        handler: H,
        options: EndpointOptions,
    ) -> Result<(), MdpClientError>
    where
        H: Send + Sync + 'static + Fn(PathRequest, PathInvocationContext) -> Fut,
        Fut: Future<Output = Result<Value, MdpClientError>> + Send + 'static,
    {
        let descriptor = PathDescriptor::Endpoint {
            path: path.into(),
            method,
            description: options.description,
            input_schema: options.input_schema,
            output_schema: options.output_schema,
            content_type: options.content_type,
        };
        self.register(descriptor, Arc::new(handler))
    }

    pub fn expose_skill_markdown(
        &mut self,
        path: impl Into<String>,
        content: impl Into<String>,
        options: SkillOptions,
    ) -> Result<(), MdpClientError> {
        let content = content.into();
        let description = options
            .description
            .or_else(|| derive_markdown_description(&content));
        let descriptor = PathDescriptor::Skill {
            path: path.into(),
            description,
            content_type: options.content_type,
        };
        self.register(
            descriptor,
            Arc::new(move |_request: PathRequest, _context: PathInvocationContext| {
                let content = content.clone();
                Box::pin(async move { Ok(Value::String(content)) }) as HandlerFuture
            }),
        )
    }

    pub fn expose_prompt_markdown(
        &mut self,
        path: impl Into<String>,
        content: impl Into<String>,
        options: PromptOptions,
    ) -> Result<(), MdpClientError> {
        let content = content.into();
        let description = options
            .description
            .or_else(|| derive_markdown_description(&content));
        let descriptor = PathDescriptor::Prompt {
            path: path.into(),
            description,
            input_schema: options.input_schema,
            output_schema: options.output_schema,
        };
        self.register(
            descriptor,
            Arc::new(move |_request: PathRequest, _context: PathInvocationContext| {
                let content = content.clone();
                Box::pin(async move { Ok(json!({"messages": [{"role": "user", "content": content}]})) })
                    as HandlerFuture
            }),
        )
    }

    pub fn describe_paths(&self) -> Vec<PathDescriptor> {
        self.entries.iter().map(|entry| entry.descriptor.clone()).collect()
    }

    pub fn describe(&self, client: &ClientInfo) -> ClientDescriptor {
        ClientDescriptor::from_info(client, self.describe_paths())
    }

    pub fn unexpose(&mut self, path: &str, method: Option<HttpMethod>) -> Result<bool, MdpClientError> {
        assert_path_pattern(path)?;
        let method = method.as_ref();
        if let Some(index) = self.entries.iter().position(|entry| match &entry.descriptor {
            PathDescriptor::Endpoint {
                path: descriptor_path,
                method: descriptor_method,
                ..
            } => descriptor_path == path && method.map(|value| value == descriptor_method).unwrap_or(false),
            PathDescriptor::Skill { path: descriptor_path, .. }
            | PathDescriptor::Prompt { path: descriptor_path, .. } => descriptor_path == path,
        }) {
            self.entries.remove(index);
            return Ok(true);
        }
        Ok(false)
    }

    pub async fn invoke(&self, message: &CallClientRequest) -> Result<Value, MdpClientError> {
        let entry = self
            .resolve_entry(&message.method, &message.path)
            .ok_or_else(|| MdpClientError::UnknownPath {
                path: message.path.clone(),
                method: message.method.as_str().to_string(),
            })?;

        let request = PathRequest {
            params: entry.params,
            queries: message.query.clone().unwrap_or_default(),
            body: message.body.clone(),
            headers: message.headers.clone().unwrap_or_default(),
        };
        let context = PathInvocationContext {
            request_id: message.request_id.clone(),
            client_id: message.client_id.clone(),
            path_type: entry.descriptor.descriptor_type().to_string(),
            method: message.method.clone(),
            path: message.path.clone(),
            auth: message.auth.clone(),
        };
        entry.handler.handle(request, context).await
    }

    fn register(&mut self, descriptor: PathDescriptor, handler: Arc<dyn PathHandler>) -> Result<(), MdpClientError> {
        assert_path_pattern(descriptor.path())?;
        assert_descriptor_path_shape(&descriptor)?;
        let key = registration_key(&descriptor);
        let entry = ProcedureEntry { descriptor, handler };
        if let Some(index) = self
            .entries
            .iter()
            .position(|current| registration_key(&current.descriptor) == key)
        {
            self.entries[index] = entry;
        } else {
            self.entries.push(entry);
        }
        Ok(())
    }

    fn resolve_entry(&self, method: &HttpMethod, path: &str) -> Option<ResolvedProcedure> {
        let mut best_match: Option<ResolvedProcedure> = None;
        for entry in &self.entries {
            if !matches_method(&entry.descriptor, method) {
                continue;
            }
            let Some(path_match) = match_path_pattern(entry.descriptor.path(), path) else {
                continue;
            };

            if best_match
                .as_ref()
                .map(|current| compare_path_specificity(&path_match.specificity, &current.specificity) > 0)
                .unwrap_or(true)
            {
                best_match = Some(ResolvedProcedure {
                    descriptor: entry.descriptor.clone(),
                    handler: entry.handler.clone(),
                    params: path_match.params,
                    specificity: path_match.specificity,
                });
            }
        }
        best_match
    }
}

fn registration_key(descriptor: &PathDescriptor) -> String {
    match descriptor {
        PathDescriptor::Endpoint { path, method, .. } => format!("{} {}", method.as_str(), path),
        PathDescriptor::Skill { path, .. } | PathDescriptor::Prompt { path, .. } => path.clone(),
    }
}

fn matches_method(descriptor: &PathDescriptor, method: &HttpMethod) -> bool {
    match descriptor {
        PathDescriptor::Endpoint {
            method: descriptor_method,
            ..
        } => descriptor_method == method,
        PathDescriptor::Skill { .. } | PathDescriptor::Prompt { .. } => *method == HttpMethod::Get,
    }
}

fn assert_path_pattern(path: &str) -> Result<(), MdpClientError> {
    if is_path_pattern(path) {
        Ok(())
    } else {
        Err(MdpClientError::InvalidPath(path.to_string()))
    }
}

fn assert_descriptor_path_shape(descriptor: &PathDescriptor) -> Result<(), MdpClientError> {
    match descriptor {
        PathDescriptor::Endpoint { path, .. } => {
            if is_skill_path(path) || is_prompt_path(path) {
                return Err(MdpClientError::InvalidPath(path.clone()));
            }
        }
        PathDescriptor::Skill { path, .. } => {
            if !is_skill_path(path) {
                return Err(MdpClientError::InvalidPath(path.clone()));
            }
        }
        PathDescriptor::Prompt { path, .. } => {
            if !is_prompt_path(path) {
                return Err(MdpClientError::InvalidPath(path.clone()));
            }
        }
    }
    Ok(())
}

fn derive_markdown_description(content: &str) -> Option<String> {
    let mut paragraph = Vec::new();
    for line in content.lines().map(str::trim) {
        if line.is_empty() {
            if !paragraph.is_empty() {
                break;
            }
            continue;
        }
        if line.starts_with('#') {
            continue;
        }
        paragraph.push(line);
    }
    if paragraph.is_empty() {
        None
    } else {
        Some(paragraph.join(" "))
    }
}
