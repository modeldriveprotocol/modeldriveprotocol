<p align="center">
  <img src="./icon.svg" alt="MDP icon" width="256" height="256" />
</p>

# Model Drive Protocol

| en-US | [zh-Hans](./README.zh-Hans.md) |
| ----- | ------------------------------ |

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
Skills can also be exposed as hierarchical Markdown documents such as `workspace/review` and `workspace/review/files`, letting hosts reveal more context by reading deeper skill paths only when needed.

Current transport support includes:

- `ws` / `wss` for bidirectional socket sessions
- `http` / `https` loop mode for long-polling runtimes
- auth envelopes on client registration and routed invocation messages
- transport auth via request headers or cookie bootstrap at `/mdp/auth`
- `GET /mdp/meta` for MDP server probing and optional upstream discovery

MDP servers can also run in a simple layered topology:

- `auto` (default): one server becomes the primary registry for runtime-local clients, and other servers can attach to it as secondaries
- `standalone`: one server owns the local registry without any inter-server links
- `proxy-required`: a server must find an upstream primary MDP server during startup or fail fast

In the primary-secondary view, MDP clients connect only to the primary server. Secondary servers stay connected to that primary so each AgentUI can use its own local server while still reaching the same client registry.

## Architecture

At a high level, one user can work through different agent UIs such as Claude Code, Codex, or Cursor. Each UI talks to its own `mdp server`, those servers form a primary-secondary triangle, and all `mdp clients` connect only to the primary:

```mermaid
flowchart LR
  user["User"]

  subgraph agents["Agent UI"]
    claude["Claude Code"]
    codex["Codex"]
    cursor["Cursor"]
  end

  subgraph servers["MDP Server Federation"]
    primary["Primary MDP Server"]
    secondaryB["Secondary MDP Server B"]
    secondaryC["Secondary MDP Server C"]
  end

  clients["MDP Clients"]
  tools["Tools"]
  skills["Skills"]
  prompts["Prompts"]
  resources["Resources"]

  user --> claude
  user --> codex
  user --> cursor

  claude <-->|"local host link"| secondaryB
  codex <-->|"local host link"| primary
  cursor <-->|"local host link"| secondaryC

  primary <-->|"federation"| secondaryB
  primary <-->|"federation"| secondaryC
  secondaryB <-->|"federation"| secondaryC

  primary <-->|"client sessions"| clients
  clients --> tools
  clients --> skills
  clients --> prompts
  clients --> resources
```

One invocation can go directly to the primary server, or pass through a secondary server when one is present:

```mermaid
sequenceDiagram
  participant User
  participant Agent as AgentUI
  participant Secondary as Secondary Server
  participant Primary as Primary Server
  participant Client as MDP Client
  participant Runtime as Local Runtime

  User->>Agent: ask for an action
  opt AgentUI is attached to a secondary server
    Agent->>Secondary: call local mdp server
    Secondary->>Primary: federated request
  end
  opt AgentUI is attached directly to the primary server
    Agent->>Primary: call local mdp server
  end
  Primary->>Client: route MDP call
  Client->>Runtime: execute local logic
  Runtime-->>Client: result
  Client-->>Primary: callClientResult
  opt Result returns through a secondary server
    Primary-->>Secondary: federated result
    Secondary-->>Agent: tool result
  end
  opt Result returns directly to the primary-side AgentUI
    Primary-->>Agent: tool result
  end
  Agent-->>User: answer
```

Connection setup follows the same structure:

- each user connects to one AgentUI
- each AgentUI connects to its own colocated MDP server
- one MDP server becomes or is configured as the primary
- all runtime-local MDP clients open transports only to that primary server
- the primary forwards registry updates and routed messages to connected secondary servers
- if the primary server becomes unavailable, one secondary server should promote itself to the new primary and take over client-facing routing

## Pick A Path

- Use [Quick Start](./docs/guide/quick-start.md) if you want the shortest path from zero to a working client plus MCP bridge.
- Use [Server Tools](./docs/server/tools/index.md) and [Server APIs](./docs/server/api/index.md) if you already understand the model and need exact data formats.
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
- [Server Tools](./docs/server/tools/index.md)
- [Server APIs](./docs/server/api/index.md)
- [JavaScript SDK Quick Start](./docs/sdk/javascript/quick-start.md)
- [Chrome Extension](./docs/apps/chrome-extension.md)
- [VSCode Extension](./docs/apps/vscode-extension.md)
- [Playground](./docs/playground/index.md)

## Contributing

For contributor workflow, release automation, maintainer setup, and CI internals, see [CONTRIBUTING.md](./CONTRIBUTING.md) and [docs/contributing](./docs/contributing/index.md).
