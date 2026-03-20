# Model Drive Protocol

MDP is a cross-runtime capability registration and RPC bridge protocol built around MCP.

In this repo, the current MVP is:

- a TypeScript MDP server
- a TypeScript client SDK that builds to JavaScript
- a VitePress documentation site
- a stable MCP bridge surface built from fixed tools instead of dynamic per-client tool generation

## What MDP Solves

MDP lets arbitrary runtimes expose internal procedures to AI through one bridge server.

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

Supported capability kinds in the MVP:

- `tools`
- `prompts`
- `skills`
- `resources`

## Workspace

```text
packages/
  protocol/  shared MDP message and model types
  server/    TypeScript MDP server + MCP bridge
  client/    TypeScript client SDK that emits JavaScript
docs/        VitePress documentation site
scripts/     repo utilities and smoke test
```

## MCP Bridge Tools

The MVP server exposes fixed MCP tools:

- `listClients`
- `callClients`
- `listTools`
- `callTools`
- `listPrompts`
- `getPrompt`
- `listSkills`
- `callSkills`
- `listResources`
- `readResource`

## Quick Start

Install dependencies:

```bash
pnpm install
```

Build the workspace:

```bash
pnpm build
```

Run the smoke test:

```bash
pnpm test
```

Run the docs site locally:

```bash
pnpm docs:dev
```

Build the docs site:

```bash
pnpm docs:build
```

## Documentation

Use the docs site for protocol and implementation details:

- [Guide](./docs/guide/introduction.md)
- [Protocol Overview](./docs/protocol/overview.md)
- [MCP Bridge](./docs/protocol/mcp-bridge.md)
- [Server MVP Design](./docs/server/mvp-design.md)
- [JS Client](./docs/client/js-client.md)
- [Embedding Other Runtimes](./docs/client/embedding.md)

## MVP Status

Current MVP scope:

- WebSocket transport on the MDP side
- in-memory client registry
- client capability registration
- routing from MCP bridge tools to connected clients
- TypeScript client runtime with JavaScript output
- browser global bundle at `packages/client/dist/mdp-client.global.js`

Out of scope for this MVP:

- auth and permission policy
- durable registry storage
- multi-node routing
- non-WebSocket transports
- native SDKs beyond the JavaScript-first client
