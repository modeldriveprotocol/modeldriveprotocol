from __future__ import annotations

import asyncio
from typing import Mapping, Optional

import httpx

from ..protocol import parse_server_to_client_message
from .base import ClientTransport, CloseHandler, MessageHandler

DEFAULT_HTTP_LOOP_PATH = "/mdp/http-loop"
SESSION_HEADER = "x-mdp-session-id"


class HttpLoopClientTransport(ClientTransport):
    def __init__(
        self,
        server_url: str,
        *,
        endpoint_path: str = DEFAULT_HTTP_LOOP_PATH,
        headers: Optional[Mapping[str, str]] = None,
        poll_wait_ms: int = 25_000,
        client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        self._server_url = server_url.rstrip("/")
        self._endpoint_path = endpoint_path.rstrip("/")
        self._headers = dict(headers or {})
        self._poll_wait_ms = poll_wait_ms
        self._client = client or httpx.AsyncClient()
        self._owns_client = client is None
        self._session_id: Optional[str] = None
        self._message_handler: Optional[MessageHandler] = None
        self._close_handler: Optional[CloseHandler] = None
        self._poll_task: Optional[asyncio.Task[None]] = None
        self._closed = True

    def set_message_handler(self, handler: MessageHandler) -> None:
        self._message_handler = handler

    def set_close_handler(self, handler: CloseHandler) -> None:
        self._close_handler = handler

    async def connect(self) -> None:
        if self._session_id is not None and not self._closed:
            return
        response = await self._client.post(
            self._endpoint_url("/connect"),
            headers=self._request_headers(),
            json={},
        )
        response.raise_for_status()
        payload = response.json()
        session_id = payload.get("sessionId")
        if not isinstance(session_id, str):
            raise RuntimeError("Invalid HTTP loop handshake response")
        self._session_id = session_id
        self._closed = False
        self._poll_task = asyncio.create_task(self._poll_loop())

    async def send(self, message: Mapping[str, object]) -> None:
        if self._session_id is None or self._closed:
            raise RuntimeError("Transport is not connected")
        response = await self._client.post(
            self._endpoint_url("/send"),
            headers=self._request_headers({SESSION_HEADER: self._session_id}),
            json={"message": dict(message)},
        )
        response.raise_for_status()

    async def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        poll_task = self._poll_task
        self._poll_task = None
        if poll_task is not None:
            poll_task.cancel()
            await asyncio.gather(poll_task, return_exceptions=True)

        session_id = self._session_id
        self._session_id = None

        if session_id is not None:
            await self._client.post(
                self._endpoint_url("/disconnect"),
                headers=self._request_headers({SESSION_HEADER: session_id}),
                json={},
            )

        if self._owns_client:
            await self._client.aclose()
        await self._emit_close()

    async def _poll_loop(self) -> None:
        while self._session_id is not None and not self._closed:
            try:
                response = await self._client.get(
                    self._endpoint_url("/poll"),
                    headers=self._request_headers(),
                    params={"sessionId": self._session_id, "waitMs": self._poll_wait_ms},
                )
                if response.status_code == 204:
                    continue
                response.raise_for_status()
                payload = response.json()
                message = payload.get("message")
                if message is None or self._message_handler is None:
                    continue
                await self._message_handler(parse_server_to_client_message(message))
            except asyncio.CancelledError:
                return
            except Exception:
                if not self._closed:
                    self._closed = True
                    self._session_id = None
                    await self._emit_close()
                return

    def _endpoint_url(self, suffix: str) -> str:
        return f"{self._server_url}{self._endpoint_path}{suffix}"

    def _request_headers(self, extra: Optional[Mapping[str, str]] = None) -> dict[str, str]:
        payload = {"content-type": "application/json", **self._headers}
        if extra is not None:
            payload.update(extra)
        return payload

    async def _emit_close(self) -> None:
        if self._close_handler is not None:
            await self._close_handler()
