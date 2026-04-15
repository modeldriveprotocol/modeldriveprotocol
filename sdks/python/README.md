# `modeldriveprotocol-client`

Python client SDK for Model Drive Protocol.

## Install

```bash
pip install modeldriveprotocol-client
```

## Quick start

```python
import asyncio

from modeldriveprotocol import ClientInfo, MdpClient


async def main() -> None:
    client = MdpClient(
        "ws://127.0.0.1:47372",
        ClientInfo(id="python-01", name="Python Client"),
    )

    client.expose_endpoint(
        "/page/search",
        "POST",
        lambda request, _context: {
            "query": request.body.get("query", "") if isinstance(request.body, dict) else "",
        },
        description="Search the current runtime.",
    )

    await client.connect()
    await client.register()


asyncio.run(main())
```

## Included transports

- WebSocket: `ws://` / `wss://`
- HTTP loop: `http://` / `https://`

Unlike the browser-focused JavaScript entrypoints, this SDK uses direct transport headers for runtime auth when needed.
