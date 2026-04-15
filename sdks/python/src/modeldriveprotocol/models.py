from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Mapping, Optional, Union

JsonPrimitive = Union[bool, float, int, str, None]
JsonValue = Union[JsonPrimitive, Dict[str, "JsonValue"], List["JsonValue"]]
JsonObject = Dict[str, JsonValue]
JsonSchema = Dict[str, Any]
RpcArguments = Dict[str, Any]
HttpMethod = str


@dataclass
class AuthContext:
    scheme: Optional[str] = None
    token: Optional[str] = None
    headers: Optional[Dict[str, str]] = None
    metadata: Optional[JsonObject] = None

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {}
        if self.scheme is not None:
            payload["scheme"] = self.scheme
        if self.token is not None:
            payload["token"] = self.token
        if self.headers is not None:
            payload["headers"] = dict(self.headers)
        if self.metadata is not None:
            payload["metadata"] = dict(self.metadata)
        return payload


@dataclass
class ClientInfo:
    id: str
    name: str
    description: Optional[str] = None
    version: Optional[str] = None
    platform: Optional[str] = None
    metadata: Optional[JsonObject] = None

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"id": self.id, "name": self.name}
        if self.description is not None:
            payload["description"] = self.description
        if self.version is not None:
            payload["version"] = self.version
        if self.platform is not None:
            payload["platform"] = self.platform
        if self.metadata is not None:
            payload["metadata"] = dict(self.metadata)
        return payload


@dataclass
class EndpointPathDescriptor:
    path: str
    method: HttpMethod
    description: Optional[str] = None
    input_schema: Optional[JsonSchema] = None
    output_schema: Optional[JsonSchema] = None
    content_type: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "type": "endpoint",
            "path": self.path,
            "method": self.method,
        }
        if self.description is not None:
            payload["description"] = self.description
        if self.input_schema is not None:
            payload["inputSchema"] = self.input_schema
        if self.output_schema is not None:
            payload["outputSchema"] = self.output_schema
        if self.content_type is not None:
            payload["contentType"] = self.content_type
        return payload


@dataclass
class SkillPathDescriptor:
    path: str
    description: Optional[str] = None
    content_type: str = "text/markdown"

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "type": "skill",
            "path": self.path,
            "contentType": self.content_type,
        }
        if self.description is not None:
            payload["description"] = self.description
        return payload


@dataclass
class PromptPathDescriptor:
    path: str
    description: Optional[str] = None
    input_schema: Optional[JsonSchema] = None
    output_schema: Optional[JsonSchema] = None

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"type": "prompt", "path": self.path}
        if self.description is not None:
            payload["description"] = self.description
        if self.input_schema is not None:
            payload["inputSchema"] = self.input_schema
        if self.output_schema is not None:
            payload["outputSchema"] = self.output_schema
        return payload


PathDescriptor = Union[
    EndpointPathDescriptor,
    SkillPathDescriptor,
    PromptPathDescriptor,
]


@dataclass
class ClientDescriptor:
    id: str
    name: str
    paths: List[PathDescriptor]
    description: Optional[str] = None
    version: Optional[str] = None
    platform: Optional[str] = None
    metadata: Optional[JsonObject] = None

    def to_dict(self) -> Dict[str, Any]:
        payload = {"id": self.id, "name": self.name, "paths": [path.to_dict() for path in self.paths]}
        if self.description is not None:
            payload["description"] = self.description
        if self.version is not None:
            payload["version"] = self.version
        if self.platform is not None:
            payload["platform"] = self.platform
        if self.metadata is not None:
            payload["metadata"] = dict(self.metadata)
        return payload


@dataclass
class SerializedError:
    code: str
    message: str
    details: Optional[JsonValue] = None

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"code": self.code, "message": self.message}
        if self.details is not None:
            payload["details"] = self.details
        return payload


@dataclass
class PathInvocationContext:
    request_id: str
    client_id: str
    type: str
    method: str
    path: str
    auth: Optional[AuthContext] = None


@dataclass
class PathRequest:
    params: RpcArguments
    queries: RpcArguments
    body: Optional[JsonValue]
    headers: Dict[str, str]


def merge_client_info(client: ClientInfo, overrides: Optional[Mapping[str, Any]] = None) -> ClientInfo:
    if not overrides:
        return client

    return ClientInfo(
        id=str(overrides.get("id", client.id)),
        name=str(overrides.get("name", client.name)),
        description=_resolve_optional_str(overrides, "description", client.description),
        version=_resolve_optional_str(overrides, "version", client.version),
        platform=_resolve_optional_str(overrides, "platform", client.platform),
        metadata=overrides.get("metadata", client.metadata),
    )


def _resolve_optional_str(
    overrides: Mapping[str, Any],
    key: str,
    fallback: Optional[str],
) -> Optional[str]:
    if key not in overrides:
        return fallback
    value = overrides[key]
    return None if value is None else str(value)
