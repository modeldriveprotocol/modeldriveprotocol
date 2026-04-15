from __future__ import annotations

from typing import Any, Mapping, Optional
from urllib.parse import urlparse

from .models import AuthContext, ClientDescriptor, ClientInfo, SerializedError, merge_client_info
from .protocol import (
    build_call_client_result_message,
    build_pong_message,
    build_register_client_message,
    build_unregister_client_message,
    build_update_client_catalog_message,
)
from .registry import PathHandler, ProcedureRegistry
from .transports.base import ClientTransport
from .transports.http_loop import HttpLoopClientTransport
from .transports.websocket import WebSocketClientTransport


class MdpClient:
    def __init__(
        self,
        server_url: str,
        client: ClientInfo,
        *,
        auth: Optional[AuthContext] = None,
        transport: Optional[ClientTransport] = None,
        transport_headers: Optional[Mapping[str, str]] = None,
    ) -> None:
        self._server_url = server_url
        self._client_info = client
        self._auth = auth
        self._registry = ProcedureRegistry()
        self._transport = transport or self._create_default_transport(server_url, transport_headers)
        self._transport.set_message_handler(self._handle_message)
        self._transport.set_close_handler(self._handle_transport_close)
        self._connected = False
        self._registered = False

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
    ) -> "MdpClient":
        self._registry.expose_endpoint(
            path,
            method,
            handler,
            description=description,
            input_schema=input_schema,
            output_schema=output_schema,
            content_type=content_type,
        )
        return self

    def expose_skill(
        self,
        path: str,
        content_or_handler: str | PathHandler,
        *,
        description: str | None = None,
        content_type: str = "text/markdown",
    ) -> "MdpClient":
        self._registry.expose_skill(
            path,
            content_or_handler,
            description=description,
            content_type=content_type,
        )
        return self

    def expose_prompt(
        self,
        path: str,
        content_or_handler: str | PathHandler,
        *,
        description: str | None = None,
        input_schema: dict[str, Any] | None = None,
        output_schema: dict[str, Any] | None = None,
    ) -> "MdpClient":
        self._registry.expose_prompt(
            path,
            content_or_handler,
            description=description,
            input_schema=input_schema,
            output_schema=output_schema,
        )
        return self

    def unexpose(self, path: str, method: str | None = None) -> bool:
        return self._registry.unexpose(path, method)

    def describe(self) -> ClientDescriptor:
        return self._registry.describe(self._client_info)

    def set_auth(self, auth: Optional[AuthContext]) -> "MdpClient":
        self._auth = auth
        return self

    async def connect(self) -> None:
        await self._transport.connect()
        self._connected = True

    async def register(self, overrides: Optional[Mapping[str, object]] = None) -> None:
        self._ensure_connected()
        self._client_info = merge_client_info(self._client_info, overrides)
        await self._transport.send(
            build_register_client_message(self.describe(), self._auth)
        )
        self._registered = True

    async def sync_catalog(self) -> None:
        self._ensure_registered()
        await self._transport.send(
            build_update_client_catalog_message(
                self._client_info.id,
                [path.to_dict() for path in self._registry.describe_paths()],
            )
        )

    async def disconnect(self) -> None:
        if self._connected and self._registered:
            await self._transport.send(build_unregister_client_message(self._client_info.id))
        await self._transport.close()
        self._connected = False
        self._registered = False

    async def _handle_message(self, message: Mapping[str, object]) -> None:
        message_type = message.get("type")
        if message_type == "ping":
            await self._transport.send(build_pong_message(int(message["timestamp"])))
            return
        if message_type == "callClient":
            await self._handle_invocation(dict(message))

    async def _handle_invocation(self, message: dict[str, object]) -> None:
        try:
            data = await self._registry.invoke(message)
            await self._transport.send(
                build_call_client_result_message(str(message["requestId"]), ok=True, data=data)
            )
        except Exception as error:
            await self._transport.send(
                build_call_client_result_message(
                    str(message["requestId"]),
                    ok=False,
                    error=SerializedError(code="handler_error", message=str(error)),
                )
            )

    async def _handle_transport_close(self) -> None:
        self._connected = False
        self._registered = False

    def _ensure_connected(self) -> None:
        if not self._connected:
            raise RuntimeError("MDP client is not connected")

    def _ensure_registered(self) -> None:
        self._ensure_connected()
        if not self._registered:
            raise RuntimeError("MDP client is not registered")

    @staticmethod
    def _create_default_transport(
        server_url: str,
        transport_headers: Optional[Mapping[str, str]],
    ) -> ClientTransport:
        parsed = urlparse(server_url)
        if parsed.scheme in {"ws", "wss"}:
            return WebSocketClientTransport(server_url, headers=transport_headers)
        if parsed.scheme in {"http", "https"}:
            return HttpLoopClientTransport(server_url, headers=transport_headers)
        raise ValueError(f"Unsupported MDP transport protocol: {parsed.scheme}")
