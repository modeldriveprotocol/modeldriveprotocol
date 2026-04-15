from __future__ import annotations

import asyncio
import json
from typing import Mapping, Optional

from websockets.asyncio.client import connect
from websockets.exceptions import ConnectionClosed

from ..protocol import parse_server_to_client_message
from .base import ClientTransport, CloseHandler, MessageHandler


class WebSocketClientTransport(ClientTransport):
    def __init__(
        self,
        server_url: str,
        *,
        headers: Optional[Mapping[str, str]] = None,
    ) -> None:
        self._server_url = server_url
        self._headers = dict(headers or {})
        self._message_handler: Optional[MessageHandler] = None
        self._close_handler: Optional[CloseHandler] = None
        self._websocket = None
        self._receive_task: Optional[asyncio.Task[None]] = None
        self._closed = True

    def set_message_handler(self, handler: MessageHandler) -> None:
        self._message_handler = handler

    def set_close_handler(self, handler: CloseHandler) -> None:
        self._close_handler = handler

    async def connect(self) -> None:
        if self._websocket is not None:
            return
        self._websocket = await connect(self._server_url, additional_headers=self._headers or None)
        self._closed = False
        self._receive_task = asyncio.create_task(self._receive_loop())

    async def send(self, message: Mapping[str, object]) -> None:
        if self._websocket is None:
            raise RuntimeError("Transport is not connected")
        await self._websocket.send(json.dumps(dict(message)))

    async def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        websocket = self._websocket
        self._websocket = None
        if websocket is not None:
            await websocket.close()
        if self._receive_task is not None:
            await asyncio.gather(self._receive_task, return_exceptions=True)
            self._receive_task = None
        await self._emit_close()

    async def _receive_loop(self) -> None:
        websocket = self._websocket
        if websocket is None:
            return
        try:
            async for payload in websocket:
                if self._message_handler is None:
                    continue
                message = parse_server_to_client_message(payload)
                await self._message_handler(message)
        except ConnectionClosed:
            pass
        finally:
            if not self._closed:
                self._closed = True
                self._websocket = None
                await self._emit_close()

    async def _emit_close(self) -> None:
        if self._close_handler is not None:
            await self._close_handler()
