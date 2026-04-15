from __future__ import annotations

import inspect
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, List, Optional, Sequence

from .models import (
    AuthContext,
    ClientDescriptor,
    ClientInfo,
    EndpointPathDescriptor,
    PathDescriptor,
    PathInvocationContext,
    PathRequest,
    PromptPathDescriptor,
    SkillPathDescriptor,
)
from .path_utils import compare_path_specificity, is_path_pattern, is_prompt_path, is_skill_path, match_path_pattern

PathHandler = Callable[[PathRequest, PathInvocationContext], Any]


@dataclass
class ProcedureEntry:
    descriptor: PathDescriptor
    handler: PathHandler


@dataclass
class ResolvedProcedure:
    descriptor: PathDescriptor
    handler: PathHandler
    params: dict[str, object]
    specificity: list[int]


class ProcedureRegistry:
    def __init__(self) -> None:
        self._entries: List[ProcedureEntry] = []

    def expose_endpoint(
        self,
        path: str,
        method: str,
        handler: PathHandler,
        *,
        description: str | None = None,
        input_schema: dict[str, Any] | None = None,
        output_schema: dict[str, Any] | None = None,
        content_type: str | None = None,
    ) -> "ProcedureRegistry":
        descriptor = EndpointPathDescriptor(
            path=path,
            method=method,
            description=description,
            input_schema=input_schema,
            output_schema=output_schema,
            content_type=content_type,
        )
        self._register(descriptor, handler)
        return self

    def expose_skill(
        self,
        path: str,
        content_or_handler: str | PathHandler,
        *,
        description: str | None = None,
        content_type: str = "text/markdown",
    ) -> "ProcedureRegistry":
        resolved_description = description
        handler: PathHandler
        if isinstance(content_or_handler, str):
            handler = _create_static_skill_handler(content_or_handler)
            resolved_description = resolved_description or _derive_markdown_description(content_or_handler)
        else:
            handler = content_or_handler

        descriptor = SkillPathDescriptor(
            path=path,
            description=resolved_description,
            content_type=content_type,
        )
        self._register(descriptor, handler)
        return self

    def expose_prompt(
        self,
        path: str,
        content_or_handler: str | PathHandler,
        *,
        description: str | None = None,
        input_schema: dict[str, Any] | None = None,
        output_schema: dict[str, Any] | None = None,
    ) -> "ProcedureRegistry":
        resolved_description = description
        handler: PathHandler
        if isinstance(content_or_handler, str):
            handler = _create_static_prompt_handler(content_or_handler)
            resolved_description = resolved_description or _derive_markdown_description(content_or_handler)
        else:
            handler = content_or_handler

        descriptor = PromptPathDescriptor(
            path=path,
            description=resolved_description,
            input_schema=input_schema,
            output_schema=output_schema,
        )
        self._register(descriptor, handler)
        return self

    def unexpose(self, path: str, method: str | None = None) -> bool:
        _assert_path_pattern(path)
        for index, entry in enumerate(self._entries):
            descriptor = entry.descriptor
            if descriptor.path != path:
                continue
            if isinstance(descriptor, EndpointPathDescriptor):
                if method is None or descriptor.method != method:
                    continue
            self._entries.pop(index)
            return True
        return False

    def describe_paths(self) -> list[PathDescriptor]:
        return [entry.descriptor for entry in self._entries]

    def describe(self, client: ClientInfo) -> ClientDescriptor:
        return ClientDescriptor(
            id=client.id,
            name=client.name,
            description=client.description,
            version=client.version,
            platform=client.platform,
            metadata=client.metadata,
            paths=self.describe_paths(),
        )

    async def invoke(self, message: dict[str, Any]) -> Any:
        entry = self._resolve_entry(str(message["method"]), str(message["path"]))
        if entry is None:
            raise LookupError(f'Unknown path "{message["path"]}" for method "{message["method"]}"')

        auth_payload = message.get("auth")
        auth = None
        if isinstance(auth_payload, dict):
            auth = AuthContext(
                scheme=auth_payload.get("scheme"),
                token=auth_payload.get("token"),
                headers=auth_payload.get("headers"),
                metadata=auth_payload.get("metadata"),
            )

        request = PathRequest(
            params=dict(entry.params),
            queries=_as_argument_record(message.get("query")),
            body=message.get("body"),
            headers=dict(message.get("headers") or {}),
        )
        context = PathInvocationContext(
            request_id=str(message["requestId"]),
            client_id=str(message["clientId"]),
            type=_descriptor_type(entry.descriptor),
            method=str(message["method"]),
            path=str(message["path"]),
            auth=auth,
        )
        return await _call_handler(entry.handler, request, context)

    def _register(self, descriptor: PathDescriptor, handler: PathHandler) -> None:
        _assert_path_pattern(descriptor.path)
        _assert_descriptor_path_shape(descriptor)
        key = _registration_key(descriptor)
        entry = ProcedureEntry(descriptor=descriptor, handler=handler)
        for index, current in enumerate(self._entries):
            if _registration_key(current.descriptor) == key:
                self._entries[index] = entry
                return
        self._entries.append(entry)

    def _resolve_entry(self, method: str, path: str) -> Optional[ResolvedProcedure]:
        best_match: Optional[ResolvedProcedure] = None
        for entry in self._entries:
            if not _matches_method(entry.descriptor, method):
                continue
            match = match_path_pattern(entry.descriptor.path, path)
            if match is None:
                continue
            if best_match is None or compare_path_specificity(match.specificity, best_match.specificity) > 0:
                best_match = ResolvedProcedure(
                    descriptor=entry.descriptor,
                    handler=entry.handler,
                    params=match.params,
                    specificity=match.specificity,
                )
        return best_match


def _registration_key(descriptor: PathDescriptor) -> str:
    if isinstance(descriptor, EndpointPathDescriptor):
        return f"{descriptor.method} {descriptor.path}"
    return descriptor.path


def _matches_method(descriptor: PathDescriptor, method: str) -> bool:
    if isinstance(descriptor, EndpointPathDescriptor):
        return descriptor.method == method
    return method == "GET"


def _assert_path_pattern(path: str) -> None:
    if not is_path_pattern(path):
        raise ValueError(
            'Invalid path pattern. Expected a leading slash, lowercase or dot-prefixed '
            "metadata segments, optional :params, and reserved leaf names skill.md, "
            "prompt.md, SKILL.md, or PROMPT.md."
        )


def _assert_descriptor_path_shape(descriptor: PathDescriptor) -> None:
    if isinstance(descriptor, EndpointPathDescriptor):
        if is_skill_path(descriptor.path) or is_prompt_path(descriptor.path):
            raise ValueError("Endpoint paths cannot target reserved skill or prompt leaf names")
        return
    if isinstance(descriptor, SkillPathDescriptor) and not is_skill_path(descriptor.path):
        raise ValueError("Skill paths must end with skill.md or SKILL.md")
    if isinstance(descriptor, PromptPathDescriptor) and not is_prompt_path(descriptor.path):
        raise ValueError("Prompt paths must end with prompt.md or PROMPT.md")


def _derive_markdown_description(content: str) -> str | None:
    paragraph: List[str] = []
    for line in (line.strip() for line in content.splitlines()):
        if not line:
            if paragraph:
                break
            continue
        if line.startswith("#"):
            continue
        paragraph.append(line)
    return " ".join(paragraph) if paragraph else None


def _create_static_skill_handler(content: str) -> PathHandler:
    async def _handler(_request: PathRequest, _context: PathInvocationContext) -> str:
        return content

    return _handler


def _create_static_prompt_handler(content: str) -> PathHandler:
    async def _handler(_request: PathRequest, _context: PathInvocationContext) -> dict[str, object]:
        return {"messages": [{"role": "user", "content": content}]}

    return _handler


async def _call_handler(
    handler: PathHandler,
    request: PathRequest,
    context: PathInvocationContext,
) -> Any:
    result = handler(request, context)
    if inspect.isawaitable(result):
        return await result
    return result


def _descriptor_type(descriptor: PathDescriptor) -> str:
    if isinstance(descriptor, EndpointPathDescriptor):
        return "endpoint"
    if isinstance(descriptor, SkillPathDescriptor):
        return "skill"
    return "prompt"


def _as_argument_record(value: object) -> dict[str, object]:
    return dict(value) if isinstance(value, dict) else {}
