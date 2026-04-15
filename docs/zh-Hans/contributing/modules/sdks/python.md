---
title: Python SDK 开发指南
status: Draft
---

# Python SDK 开发指南

当你开发 `sdks/python` 时，使用这页。

## 这个模块负责什么

`sdks/python` 负责：

- Python 协议模型和消息 helper
- registry 行为和路径匹配
- websocket 和 HTTP loop client transport
- package 元数据和 Python 侧测试

它不负责：

- `packages/protocol` 下的协议真源
- `packages/server` 下的服务端路由逻辑
- JavaScript SDK 的浏览器专用 auth bootstrap 行为

## 本地环境

在 SDK 目录里创建一个虚拟环境：

```bash
cd sdks/python
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e '.[test]'
```

## 构建与测试

先从 package 级命令开始：

```bash
cd sdks/python
. .venv/bin/activate
python -m compileall src/modeldriveprotocol
pytest -q
python -m build
```

它们分别证明：

- `compileall`
  先快速挡住语法回归
- `pytest -q`
  验证 registry 行为、register 流程、ping/pong 和 invocation handling
- `python -m build`
  证明 package 元数据和 wheel/sdist 仍能正确构建

## 常见开发回路

常见回路是：

1. 修改 `src/modeldriveprotocol/**`
2. 运行 `pytest -q`
3. 如果 transport 或打包逻辑改了，再运行 `python -m build`
4. 如果行为是跟随协议变化，再去对照 `packages/protocol/src/**`

## 调试预期

先用最小层级定位问题：

- registry / path 问题：
  在 `tests/test_registry.py` 补或改测试
- lifecycle 问题：
  在 `tests/test_client.py` 补或改测试
- transport 问题：
  先用假 transport 或注入 client 隔离，再去接真实服务端

如果你需要排查真实运行时会话，先打印原始 JSON 消息形状，不要一开始就改 Python model。这里最常见的首发问题是消息字段漂移或路径形状不匹配。

## 常见故障

- `MDP client is not connected`
  在 `connect()` 前调用了 `register()` 或 `sync_catalog()`
- routed invocation 找不到路径
  注册的 path pattern 和收到的 concrete path 段数不一致
- skill / prompt 路径出现 handler error
  保留叶子 `skill.md` 或 `prompt.md` 被当成 endpoint 暴露了
- HTTP loop 会话异常结束
  先看 `/connect`、`/send`、`/poll` 的状态码，再决定要不要改 client 逻辑

## 发布与打包说明

这个 SDK 走共享的 `v*` release workflow。

本地发布前检查：

```bash
cd sdks/python
. .venv/bin/activate
pytest -q
python -m build
```

仓库侧的发布要求放在 [多语言 SDK 包发布](/zh-Hans/contributing/releasing-sdks)。
