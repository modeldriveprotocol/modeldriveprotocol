from __future__ import annotations

from typing import Awaitable, Callable, Mapping, Protocol

MessageHandler = Callable[[Mapping[str, object]], Awaitable[None]]
CloseHandler = Callable[[], Awaitable[None]]


class ClientTransport(Protocol):
    def set_message_handler(self, handler: MessageHandler) -> None:
        ...

    def set_close_handler(self, handler: CloseHandler) -> None:
        ...

    async def connect(self) -> None:
        ...

    async def send(self, message: Mapping[str, object]) -> None:
        ...

    async def close(self) -> None:
        ...
