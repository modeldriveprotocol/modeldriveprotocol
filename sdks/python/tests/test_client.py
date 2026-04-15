from __future__ import annotations

from collections.abc import Mapping
from typing import Optional

import pytest

from modeldriveprotocol import AuthContext, ClientInfo, MdpClient


class FakeTransport:
    def __init__(self) -> None:
        self.sent: list[dict[str, object]] = []
        self.connected = False
        self.message_handler = None
        self.close_handler = None

    def set_message_handler(self, handler) -> None:
        self.message_handler = handler

    def set_close_handler(self, handler) -> None:
        self.close_handler = handler

    async def connect(self) -> None:
        self.connected = True

    async def send(self, message: Mapping[str, object]) -> None:
        self.sent.append(dict(message))

    async def close(self) -> None:
        self.connected = False
        if self.close_handler is not None:
            await self.close_handler()

    async def emit(self, message: Mapping[str, object]) -> None:
        if self.message_handler is not None:
            await self.message_handler(dict(message))


@pytest.mark.asyncio
async def test_register_requires_connection() -> None:
    transport = FakeTransport()
    client = MdpClient(
        "ws://127.0.0.1:7070",
        ClientInfo(id="python-01", name="Python Client"),
        transport=transport,
    )

    with pytest.raises(RuntimeError, match="MDP client is not connected"):
        await client.register()


@pytest.mark.asyncio
async def test_registers_exposed_paths_after_connect() -> None:
    transport = FakeTransport()
    client = MdpClient(
        "ws://127.0.0.1:7070",
        ClientInfo(id="python-01", name="Python Client"),
        auth=AuthContext(scheme="Bearer", token="client-token"),
        transport=transport,
    )

    client.expose_endpoint("/goods", "GET", lambda _request, _context: {"list": [], "total": 0}, description="List goods")
    client.expose_skill("/overview/skill.md", "# Overview")

    await client.connect()
    await client.register({"description": "Test python client"})

    assert transport.connected is True
    assert transport.sent == [
        {
            "type": "registerClient",
            "client": {
                "id": "python-01",
                "name": "Python Client",
                "description": "Test python client",
                "paths": [
                    {
                        "type": "endpoint",
                        "path": "/goods",
                        "method": "GET",
                        "description": "List goods",
                    },
                    {
                        "type": "skill",
                        "path": "/overview/skill.md",
                        "contentType": "text/markdown",
                    },
                ],
            },
            "auth": {
                "scheme": "Bearer",
                "token": "client-token",
            },
        }
    ]


@pytest.mark.asyncio
async def test_handles_ping_and_invocation_messages() -> None:
    transport = FakeTransport()
    client = MdpClient(
        "ws://127.0.0.1:7070",
        ClientInfo(id="python-01", name="Python Client"),
        transport=transport,
    )

    client.expose_endpoint(
        "/goods/:id",
        "GET",
        lambda request, context: {
            "id": request.params["id"],
            "page": request.queries["page"],
            "authToken": context.auth.token if context.auth is not None else None,
        },
    )

    await transport.emit({"type": "ping", "timestamp": 123})
    await transport.emit(
        {
            "type": "callClient",
            "requestId": "req-01",
            "clientId": "python-01",
            "method": "GET",
            "path": "/goods/sku-01",
            "query": {"page": 2},
            "auth": {"token": "host-token"},
        }
    )

    assert transport.sent == [
        {"type": "pong", "timestamp": 123},
        {
            "type": "callClientResult",
            "requestId": "req-01",
            "ok": True,
            "data": {
                "id": "sku-01",
                "page": 2,
                "authToken": "host-token",
            },
        },
    ]
