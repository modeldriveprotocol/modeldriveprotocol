<p align="center">
  <img src="./icon.svg" alt="MDP icon" width="96" height="96" />
</p>

# Model Drive Protocol

| en-US | [zh-Hans](./README.zh-Hans.md) |
| --- | --- |

> The ultimate solution for connecting models with everything.

MDP turns runtime-local capabilities into MCP-reachable capabilities.

If your useful logic lives inside a browser tab, mobile app, desktop process, embedded runtime, or local agent, MDP gives it one bridge server to register with and one stable way for AI hosts to call it.

Instead of standing up a separate MCP server for every runtime, MDP keeps responsibilities clean:

- clients own capabilities
- the MDP server owns registration and routing
- MCP hosts talk to one fixed bridge surface

## Why MDP Exists

MCP is a strong host-side protocol, but many real capabilities live somewhere else: inside apps, devices, browser sessions, and local processes.

MDP is the layer between those runtimes and MCP. It lets arbitrary runtimes register capabilities and route invocations through one server without generating a brand-new MCP tool surface for every connected client.

A typical setup looks like this:

- a web app exposes user-context tools
- a mobile app exposes device-local actions
- a local process exposes operational procedures
- one MDP server presents all of them to MCP hosts through fixed bridge tools

That runtime can be:

- Web
- Android
- iOS
- Qt / C++
- Node.js
- Python / Go / Rust / Java
- native device or local agent processes

The core model is:

- clients provide capabilities
- the MDP server maintains registration and routing
- the MDP server exposes bridge tools to MCP hosts

Capabilities can be exposed as `tools`, `prompts`, `skills`, and `resources`.

Current transport support includes:

- `ws` / `wss` for bidirectional socket sessions
- `http` / `https` loop mode for long-polling runtimes
- auth envelopes on client registration and routed invocation messages
- transport auth via request headers or cookie bootstrap at `/mdp/auth`

## Architecture

At a high level, MDP sits between MCP hosts and runtime-local capabilities:

```mermaid
flowchart LR
  host["MCP Host"] <-->|"fixed bridge tools"| server["MDP Server<br/>registry + routing"]
  server <-->|"capability registration<br/>invocation routing"| clients["MDP Clients"]
  clients --> web["Web App"]
  clients --> mobile["Mobile App"]
  clients --> local["Desktop / Device / Local Process"]
```

## Pick A Path

- Use [Quick Start](./docs/guide/quick-start.md) if you want the shortest path from zero to a working client plus MCP bridge.
- Use [Server Tools](./docs/server/tools.md) and [Server APIs](./docs/server/api.md) if you already understand the model and need exact data formats.
- Use [JavaScript SDK Quick Start](./docs/sdk/javascript/quick-start.md) if you want to embed MDP into a browser page, local process, or custom runtime.
- Use [Chrome Extension](./docs/apps/chrome-extension.md) or [VSCode Extension](./docs/apps/vscode-extension.md) if you want a packaged runtime integration instead of wiring the SDK yourself.

## What Is In This Repo

- `packages/protocol`: protocol models, message types, guards, and errors
- `packages/server`: MDP server runtime, transport server, and fixed MCP bridge
- `packages/client`: JavaScript client SDK and browser bundle
- `apps/chrome-extension`: packaged Chrome runtime integration
- `apps/vscode-extension`: packaged VSCode runtime integration
- `docs`: VitePress documentation site and Playground

## Documentation

Use the docs for getting started, exact tool and API formats, and packaged integration guidance:

- [Quick Start](./docs/guide/quick-start.md)
- [What Is MDP?](./docs/guide/introduction.md)
- [Architecture](./docs/guide/architecture.md)
- [Server Tools](./docs/server/tools.md)
- [Server APIs](./docs/server/api.md)
- [JavaScript SDK Quick Start](./docs/sdk/javascript/quick-start.md)
- [Chrome Extension](./docs/apps/chrome-extension.md)
- [VSCode Extension](./docs/apps/vscode-extension.md)
- [Playground](./docs/playground/index.md)

## Development

For contributor workflow, release automation, and maintainer setup, see [DEVELOPING.md](./DEVELOPING.md).
