---
title: Quick Start
status: Draft
---

# Python Quick Start

Use the Python SDK when your MDP client lives in a local process, server runtime, worker, or desktop app.

## 1. Install the package

```bash
pip install modeldriveprotocol-client
```

## 2. Create a client

```python
import asyncio

from modeldriveprotocol import ClientInfo, MdpClient

client = MdpClient(
    "ws://127.0.0.1:47372",
    ClientInfo(id="python-01", name="Python Client"),
)
```

## 3. Expose one path

```python
client.expose_endpoint(
    "/page/search",
    "POST",
    lambda request, _context: {
        "query": request.body.get("query", "") if isinstance(request.body, dict) else "",
    },
    description="Search the current runtime.",
)
```

## 4. Connect and register

```python
async def main() -> None:
    await client.connect()
    await client.register()

asyncio.run(main())
```

## Transport support

The Python SDK currently supports:

- `ws` / `wss`
- `http` / `https` loop mode

For contributor workflow, debugging notes, and local package validation, continue with [Python SDK Guide](/contributing/modules/sdks/python).
