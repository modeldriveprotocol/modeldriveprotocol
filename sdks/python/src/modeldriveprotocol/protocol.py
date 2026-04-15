from __future__ import annotations

import json
from typing import Any, Dict, Mapping, Optional

from .models import AuthContext, ClientDescriptor, SerializedError
from .path_utils import is_concrete_path

ClientToServerMessage = Dict[str, Any]
ServerToClientMessage = Dict[str, Any]


def build_register_client_message(
    client: ClientDescriptor,
    auth: Optional[AuthContext],
) -> ClientToServerMessage:
    payload: ClientToServerMessage = {"type": "registerClient", "client": client.to_dict()}
    if auth is not None:
        payload["auth"] = auth.to_dict()
    return payload


def build_update_client_catalog_message(client_id: str, paths: list[Mapping[str, Any]]) -> ClientToServerMessage:
    return {"type": "updateClientCatalog", "clientId": client_id, "paths": list(paths)}


def build_unregister_client_message(client_id: str) -> ClientToServerMessage:
    return {"type": "unregisterClient", "clientId": client_id}


def build_call_client_result_message(
    request_id: str,
    *,
    ok: bool,
    data: Any = None,
    error: Optional[SerializedError] = None,
) -> ClientToServerMessage:
    payload: ClientToServerMessage = {"type": "callClientResult", "requestId": request_id, "ok": ok}
    if ok:
        payload["data"] = data
    elif error is not None:
        payload["error"] = error.to_dict()
    return payload


def build_pong_message(timestamp: int) -> ClientToServerMessage:
    return {"type": "pong", "timestamp": timestamp}


def parse_server_to_client_message(raw: str | bytes | Mapping[str, Any]) -> ServerToClientMessage:
    if isinstance(raw, (str, bytes)):
        value = json.loads(raw)
    else:
        value = dict(raw)

    if not isinstance(value, dict):
        raise ValueError("Invalid MDP message payload")

    message_type = value.get("type")
    if message_type in {"ping", "pong"}:
        if not isinstance(value.get("timestamp"), int):
            raise ValueError("Invalid heartbeat payload")
        return value

    if message_type == "callClient":
        if not isinstance(value.get("requestId"), str):
            raise ValueError("Missing requestId")
        if not isinstance(value.get("clientId"), str):
            raise ValueError("Missing clientId")
        if not isinstance(value.get("method"), str):
            raise ValueError("Missing method")
        path = value.get("path")
        if not isinstance(path, str) or not is_concrete_path(path):
            raise ValueError("Invalid path")
        return value

    raise ValueError("Unsupported MDP message")
