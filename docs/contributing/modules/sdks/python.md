---
title: Python SDK Guide
status: Draft
---

# Python SDK Guide

Use this guide when you are developing `sdks/python`.

## What this module owns

`sdks/python` owns:

- Python protocol models and message helpers
- registry behavior and path matching
- websocket and HTTP loop client transports
- package metadata and Python-side tests

It does not own:

- protocol source of truth under `packages/protocol`
- server routing logic under `packages/server`
- browser-specific auth bootstrap behavior from the JavaScript SDK

## Local setup

Create one virtualenv inside the SDK directory:

```bash
cd sdks/python
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e '.[test]'
```

## Build and test

Use the package-scoped commands first:

```bash
cd sdks/python
. .venv/bin/activate
python -m compileall src/modeldriveprotocol
pytest -q
python -m build
```

What they prove:

- `compileall`
  catches basic syntax regressions quickly
- `pytest -q`
  validates registry behavior, register flow, ping/pong, and invocation handling
- `python -m build`
  proves the package metadata and wheel/sdist build still work

## Common development workflow

Typical loop:

1. update `src/modeldriveprotocol/**`
2. run `pytest -q`
3. if transport or packaging changed, run `python -m build`
4. if behavior mirrors a protocol change, verify the corresponding TypeScript protocol package too

## Debugging expectations

Start with the narrowest layer that can prove the bug:

- registry/path bugs:
  add or adjust tests in `tests/test_registry.py`
- lifecycle bugs:
  add or adjust tests in `tests/test_client.py`
- transport bugs:
  isolate the transport with a fake server or injected client first

If you need to debug a real runtime session, log the raw JSON message shape before assuming the Python model is wrong. Most first-failure cases here are message-shape drift or path-shape mismatch.

## Common failure modes

- `MDP client is not connected`
  `register()` or `sync_catalog()` ran before `connect()`
- unknown path for a routed invocation
  the registered path pattern and the concrete call path do not have the same segment count
- handler error on skill or prompt paths
  a reserved `skill.md` or `prompt.md` leaf was exposed as an endpoint
- HTTP loop session closes unexpectedly
  inspect `/connect`, `/send`, and `/poll` status codes before changing client logic

## Release and packaging notes

This SDK is published by the shared `v*` release workflow.

Local preflight:

```bash
cd sdks/python
. .venv/bin/activate
pytest -q
python -m build
```

Repository-side publishing expectations live in [Polyglot SDK Packages](/contributing/releasing-sdks).
