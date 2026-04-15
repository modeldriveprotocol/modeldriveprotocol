mod client;
mod error;
mod models;
mod path_utils;
mod protocol;
mod registry;
mod transport;

pub use client::MdpClient;
pub use error::MdpClientError;
pub use models::{
    AuthContext, ClientDescriptor, ClientInfo, ClientInfoOverride, EndpointOptions, HttpMethod,
    PathDescriptor, PathInvocationContext, PathRequest, PromptOptions, SerializedError, SkillOptions,
};
pub use path_utils::{
    compare_path_specificity, is_concrete_path, is_path_pattern, is_prompt_path, is_skill_path,
    match_path_pattern, PathPatternMatch,
};
pub use protocol::{CallClientRequest, ClientToServerMessage, ServerToClientMessage};
pub use registry::{PathHandler, ProcedureRegistry};
pub use transport::{ClientTransport, HttpLoopClientTransport, WebSocketClientTransport};
