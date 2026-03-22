---
title: CLI Reference
status: Draft
---

# CLI Reference

The server CLI is the main entry point for local runtime testing, MCP bridge startup, and layered hub or edge deployment.

## Usage

```bash
modeldriveprotocol-server [options]
```

If you do not have the package installed globally, use:

```bash
npx @modeldriveprotocol/server [options]
```

The package also installs the shorter `mdp` binary:

```bash
mdp [options]
mdp setup [options]
```

## Help

Print the built-in help text:

```bash
npx @modeldriveprotocol/server --help
```

Built-in help output:

<!-- GENERATED:cli-help:start -->
```text
Usage: modeldriveprotocol-server [options]
       modeldriveprotocol-server setup [options]

Commands:
  setup                                           Configure supported agent and IDE MCP hosts

Options:
  --host <host>                                    Bind host (default: 127.0.0.1)
  --port <port>                                    Bind port (default: 47372; auto/proxy-required use 0 after upstream discovery when omitted)
  --tls-key <path>                                 TLS private key path
  --tls-cert <path>                                TLS certificate path
  --tls-ca <path>                                  TLS CA bundle path
  --server-id <id>                                 Stable server identity exposed in /mdp/meta
  -h, --help                                       Show this help text
  --cluster-mode <standalone|auto|proxy-required>  Startup topology mode (default: auto)
  --upstream-url <ws-url>                          Explicit upstream hub websocket URL
  --discover-host <host>                           Discovery host (default: 127.0.0.1)
  --discover-start-port <port>                     First port to probe (default: 47372)
  --discover-attempts <count>                      Number of consecutive ports to probe (default: 100)

Examples:
  modeldriveprotocol-server --port 47372 --server-id hub
  modeldriveprotocol-server --cluster-mode auto --server-id edge-01
  modeldriveprotocol-server --cluster-mode proxy-required --upstream-url ws://127.0.0.1:47372
  modeldriveprotocol-server setup --cursor
```
<!-- GENERATED:cli-help:end -->

## Setup Command

Use `setup` to configure common MCP-capable hosts quickly:

```bash
npx mdp setup
```

If you need to run through the package entry directly:

```bash
npx @modeldriveprotocol/server setup
```

The setup command supports:

- `--claude` to configure Claude Code
- `--codex` to configure Codex
- `--cursor` to configure Cursor
- `--scope user|project` to choose user or project scope where supported
- `--dry-run` to preview changes without writing config

## Core Options

<!-- GENERATED:core-options:start -->
| Option | Purpose |
| --- | --- |
| `--host <host>` | Bind host. Default: `127.0.0.1`. |
| `--port <port>` | Bind port. Default: `47372`. In auto and proxy-required mode, omitted `--port` falls back to `0` only after an upstream hub is discovered, so the edge can use an ephemeral free port. |
| `--tls-key <path>` | TLS private key path. |
| `--tls-cert <path>` | TLS certificate path. |
| `--tls-ca <path>` | Optional TLS CA bundle path. |
| `--server-id <id>` | Stable server identity exposed by `/mdp/meta`. |
| `-h, --help` | Print help and exit. |
<!-- GENERATED:core-options:end -->

## Cluster Options

<!-- GENERATED:cluster-options:start -->
| Option | Purpose |
| --- | --- |
| `--cluster-mode <standalone|auto|proxy-required>` | Startup topology mode. Default: `auto`. |
| `--upstream-url <ws-url>` | Skip discovery and connect to one explicit upstream hub. |
| `--discover-host <host>` | Discovery host. Default: `127.0.0.1`. |
| `--discover-start-port <port>` | First port to probe. Default: `47372`. |
| `--discover-attempts <count>` | Number of consecutive ports to probe. Default: `100`. |
<!-- GENERATED:cluster-options:end -->

## Modes

### `standalone`

Run one server as both registry and bridge surface.

```bash
npx @modeldriveprotocol/server --port 47372 --server-id hub
```

### `auto`

Probe for an upstream MDP hub. If found, mirror local clients upward. If not found, keep running standalone.

```bash
npx @modeldriveprotocol/server --cluster-mode auto --server-id edge-01
```

### `proxy-required`

Require an upstream MDP hub. If discovery fails, startup fails.

```bash
npx @modeldriveprotocol/server \
  --cluster-mode proxy-required \
  --discover-host 127.0.0.1 \
  --discover-start-port 47372 \
  --discover-attempts 100 \
  --server-id edge-02
```

## Explicit Upstream Example

```bash
npx @modeldriveprotocol/server \
  --port 47170 \
  --cluster-mode proxy-required \
  --upstream-url ws://127.0.0.1:47372 \
  --server-id edge-01
```

## Startup Output

On startup, the CLI prints:

- websocket endpoint
- HTTP loop endpoint
- auth endpoint
- metadata probe endpoint
- whether the server is running standalone or attached to an upstream hub

## Related Pages

- [Deployment Modes](/server/deployment)
- [APIs](/server/api/)
- [Security](/server/security)
