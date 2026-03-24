# Architecture

Use this note when you are new to the repository or need the repo reading order, workspace map, and high-level architecture overview.

## Project Purpose

This repository implements Model Drive Protocol (MDP):

- clients expose capabilities
- the MDP server registers and routes those capabilities
- the MDP server exposes a fixed MCP bridge surface to hosts

The repository is intentionally split so protocol models, server runtime, client runtime, and docs can evolve without collapsing into one package.

## Read This Repo In This Order

If you are new to the project, read files in this order:

1. [README.md](../README.md)
2. [docs/protocol/overview.md](../docs/protocol/overview.md)
3. [packages/protocol/src/models.ts](../packages/protocol/src/models.ts)
4. [packages/protocol/src/messages.ts](../packages/protocol/src/messages.ts)
5. [packages/protocol/src/cluster-messages.ts](../packages/protocol/src/cluster-messages.ts)
6. [packages/server/src/mdp-server.ts](../packages/server/src/mdp-server.ts)
7. [packages/server/src/transport-server.ts](../packages/server/src/transport-server.ts)
8. [packages/server/src/cluster-manager.ts](../packages/server/src/cluster-manager.ts)
9. [packages/server/src/mcp-bridge.ts](../packages/server/src/mcp-bridge.ts)
10. [packages/client/src/mdp-client.ts](../packages/client/src/mdp-client.ts)
11. [scripts/smoke-test.mjs](../scripts/smoke-test.mjs)
12. [packages/protocol/test/guards.test.ts](../packages/protocol/test/guards.test.ts)
13. [packages/client/test/mdp-client.test.ts](../packages/client/test/mdp-client.test.ts)
14. [packages/server/test/invocation-router.test.ts](../packages/server/test/invocation-router.test.ts)
15. [packages/server/test/cluster-manager.test.ts](../packages/server/test/cluster-manager.test.ts)

That order mirrors the intended abstraction stack:

- project intent
- protocol contract
- server routing model
- client embedding model
- end-to-end verification
- focused unit-test expectations

## Workspace Map

### `packages/protocol`

Pure protocol layer.

Read here when working on:

- message schema
- cluster control messages
- capability descriptors
- error model
- guards and validation helpers

Key files:

- [packages/protocol/src/models.ts](../packages/protocol/src/models.ts)
- [packages/protocol/src/messages.ts](../packages/protocol/src/messages.ts)
- [packages/protocol/src/cluster-messages.ts](../packages/protocol/src/cluster-messages.ts)
- [packages/protocol/src/errors.ts](../packages/protocol/src/errors.ts)
- [packages/protocol/src/guards.ts](../packages/protocol/src/guards.ts)
- [packages/protocol/test/guards.test.ts](../packages/protocol/test/guards.test.ts)

### `packages/server`

MDP server runtime plus MCP bridge.

Read here when working on:

- client registration lifecycle
- capability indexing
- invocation routing
- primary election and server-to-server failover
- MCP bridge tools
- WebSocket / HTTP loop transports
- TLS listener setup
- transport-carried authentication

Key files:

- [packages/server/src/mdp-server.ts](../packages/server/src/mdp-server.ts)
- [packages/server/src/client-session.ts](../packages/server/src/client-session.ts)
- [packages/server/src/capability-index.ts](../packages/server/src/capability-index.ts)
- [packages/server/src/invocation-router.ts](../packages/server/src/invocation-router.ts)
- [packages/server/src/mcp-bridge.ts](../packages/server/src/mcp-bridge.ts)
- [packages/server/src/transport-server.ts](../packages/server/src/transport-server.ts)
- [packages/server/src/cluster-manager.ts](../packages/server/src/cluster-manager.ts)
- [packages/server/src/ws-server.ts](../packages/server/src/ws-server.ts)
- [packages/server/src/cli.ts](../packages/server/src/cli.ts)
- [packages/server/test/capability-index.test.ts](../packages/server/test/capability-index.test.ts)
- [packages/server/test/cluster-manager.test.ts](../packages/server/test/cluster-manager.test.ts)
- [packages/server/test/invocation-router.test.ts](../packages/server/test/invocation-router.test.ts)
- [packages/server/test/mdp-server.test.ts](../packages/server/test/mdp-server.test.ts)
- [packages/server/test/transport-server.test.ts](../packages/server/test/transport-server.test.ts)

### `packages/client`

Client SDK and browser bundle entry points.

Read here when working on:

- capability exposure APIs
- client registration
- invocation dispatch
- browser embedding
- transport replacement

Key files:

- [packages/client/src/mdp-client.ts](../packages/client/src/mdp-client.ts)
- [packages/client/src/http-loop-client.ts](../packages/client/src/http-loop-client.ts)
- [packages/client/src/procedure-registry.ts](../packages/client/src/procedure-registry.ts)
- [packages/client/src/ws-client.ts](../packages/client/src/ws-client.ts)
- [packages/client/src/browser-entry.ts](../packages/client/src/browser-entry.ts)
- [packages/client/src/global.ts](../packages/client/src/global.ts)
- [packages/client/test/procedure-registry.test.ts](../packages/client/test/procedure-registry.test.ts)
- [packages/client/test/mdp-client.test.ts](../packages/client/test/mdp-client.test.ts)
- [packages/client/test/browser-entry.test.ts](../packages/client/test/browser-entry.test.ts)

### `docs`

VitePress documentation site.

Read here when working on:

- protocol explanations
- examples
- quick start
- roadmap
- GitHub Pages behavior

Key files:

- [docs/.vitepress/config.mts](../docs/.vitepress/config.mts)
- [docs/protocol/message-schema.md](../docs/protocol/message-schema.md)
- [docs/protocol/mcp-bridge.md](../docs/protocol/mcp-bridge.md)
- [docs/client/js-client.md](../docs/client/js-client.md)
- [docs/reference/roadmap.md](../docs/reference/roadmap.md)

### `apps/vscode-extension`

VSCode extension host app that embeds the MDP client and exposes editor/workspace capabilities.

Read here when working on:

- extension activation and connection lifecycle
- VSCode capability registration
- editor/workspace snapshot shaping
- local extension development workflow

Key files:

- [apps/vscode-extension/AGENTS.md](../apps/vscode-extension/AGENTS.md)
- [apps/vscode-extension/src/extension.ts](../apps/vscode-extension/src/extension.ts)
- [apps/vscode-extension/src/extension-controller.ts](../apps/vscode-extension/src/extension-controller.ts)
- [apps/vscode-extension/src/capabilities/index.ts](../apps/vscode-extension/src/capabilities/index.ts)
- [apps/vscode-extension/src/config.ts](../apps/vscode-extension/src/config.ts)
- [apps/vscode-extension/src/model.ts](../apps/vscode-extension/src/model.ts)
- [apps/vscode-extension/test/capabilities.test.ts](../apps/vscode-extension/test/capabilities.test.ts)

### `apps/chrome-extension`

Chrome extension app that embeds an MDP client in a Manifest V3 background worker and bridges into page content scripts.

Read here when working on:

- extension connection lifecycle and host permissions
- page command dispatch and main-world bridge injection
- popup/options UI behavior
- Chrome-specific capability registration

Key files:

- [apps/chrome-extension/AGENTS.md](../apps/chrome-extension/AGENTS.md)
- [apps/chrome-extension/src/background/index.ts](../apps/chrome-extension/src/background/index.ts)
- [apps/chrome-extension/src/background/runtime.ts](../apps/chrome-extension/src/background/runtime.ts)
- [apps/chrome-extension/src/background/capabilities/index.ts](../apps/chrome-extension/src/background/capabilities/index.ts)
- [apps/chrome-extension/src/background/capabilities/page.ts](../apps/chrome-extension/src/background/capabilities/page.ts)
- [apps/chrome-extension/src/page/content-script.ts](../apps/chrome-extension/src/page/content-script.ts)
- [apps/chrome-extension/src/page/injected-main.ts](../apps/chrome-extension/src/page/injected-main.ts)
- [apps/chrome-extension/src/ui/popup.ts](../apps/chrome-extension/src/ui/popup.ts)
- [apps/chrome-extension/src/ui/options.ts](../apps/chrome-extension/src/ui/options.ts)
- [apps/chrome-extension/test/page-visibility.test.ts](../apps/chrome-extension/test/page-visibility.test.ts)

### `scripts`

Repo-level utilities.

Key files:

- [scripts/smoke-test.mjs](../scripts/smoke-test.mjs)
- [scripts/prepare-docs.mjs](../scripts/prepare-docs.mjs)
- [scripts/clean.mjs](../scripts/clean.mjs)
