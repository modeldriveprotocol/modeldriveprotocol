---
title: 简易上手
status: Draft
---

# Python SDK / 简易上手

当你的 MDP client 运行在本地进程、服务端运行时、worker 或桌面应用里时，使用 Python SDK。

## 1. 安装包

```bash
pip install modeldriveprotocol-client
```

## 2. 创建 client

```python
import asyncio

from modeldriveprotocol import ClientInfo, MdpClient

client = MdpClient(
    "ws://127.0.0.1:47372",
    ClientInfo(id="python-01", name="Python Client"),
)
```

## 3. 暴露一个路径

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

## 4. 连接并注册

```python
async def main() -> None:
    await client.connect()
    await client.register()

asyncio.run(main())
```

## 当前 transport 支持

Python SDK 当前支持：

- `ws` / `wss`
- `http` / `https` loop mode

如果你要看维护者视角的开发、调试和本地验证流程，继续阅读 [Python SDK 开发指南](/zh-Hans/contributing/modules/sdks/python)。
