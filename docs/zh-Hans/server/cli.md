---
title: CLI 参数
status: Draft
---

# CLI 参数

server CLI 是本地 runtime 调试、MCP bridge 启动，以及分层 hub / edge 部署的主要入口。

## 用法

```bash
modeldriveprotocol-server [options]
```

如果你没有全局安装这个包，也可以直接用：

```bash
npx @modeldriveprotocol/server [options]
```

这个包也会安装一个更短的 `mdp` 二进制执行文件：

```bash
mdp [options]
mdp setup [options]
```

## 帮助

打印内置帮助：

```bash
npx @modeldriveprotocol/server --help
```

内置帮助输出：

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

## setup 子命令

可以用 `setup` 快速配置常见的 MCP host：

```bash
npx mdp setup
```

如果你更希望直接通过包入口运行，也可以：

```bash
npx @modeldriveprotocol/server setup
```

这个子命令支持：

- `--claude`：配置 Claude Code
- `--codex`：配置 Codex
- `--cursor`：配置 Cursor
- `--scope user|project`：在支持的 host 里选择用户级或项目级
- `--dry-run`：只预览要写入的变更，不真正落盘

## 核心参数

<!-- GENERATED:core-options:start -->
| 参数 | 作用 |
| --- | --- |
| `--host <host>` | 绑定地址。默认：`127.0.0.1`。 |
| `--port <port>` | 绑定端口。默认：`47372`。在 auto 和 proxy-required 模式下，只有在发现上游 hub 之后，省略 `--port` 才会回退到 `0`，让 edge 自动拿一个空闲临时端口。 |
| `--tls-key <path>` | TLS 私钥路径。 |
| `--tls-cert <path>` | TLS 证书路径。 |
| `--tls-ca <path>` | 可选的 TLS CA bundle 路径。 |
| `--server-id <id>` | 暴露在 `/mdp/meta` 里的稳定 server 身份。 |
| `-h, --help` | 打印帮助并退出。 |
<!-- GENERATED:core-options:end -->

## Cluster 参数

<!-- GENERATED:cluster-options:start -->
| 参数 | 作用 |
| --- | --- |
| `--cluster-mode <standalone|auto|proxy-required>` | 启动拓扑模式。默认：`auto`。 |
| `--upstream-url <ws-url>` | 跳过发现流程，直接连接一个显式指定的上游 hub。 |
| `--discover-host <host>` | 发现流程使用的 host。默认：`127.0.0.1`。 |
| `--discover-start-port <port>` | 开始探测的首个端口。默认：`47372`。 |
| `--discover-attempts <count>` | 最多连续探测多少个端口。默认：`100`。 |
<!-- GENERATED:cluster-options:end -->

## 模式说明

### `standalone`

一个 server 同时承担 registry 和 bridge surface。

```bash
npx @modeldriveprotocol/server --port 47372 --server-id hub
```

### `auto`

先探测是否存在上游 MDP hub。找到就把本地 clients 向上镜像；找不到就继续 standalone 运行。

```bash
npx @modeldriveprotocol/server --cluster-mode auto --server-id edge-01
```

### `proxy-required`

必须存在上游 MDP hub。如果发现流程失败，启动直接失败。

```bash
npx @modeldriveprotocol/server \
  --cluster-mode proxy-required \
  --discover-host 127.0.0.1 \
  --discover-start-port 47372 \
  --discover-attempts 100 \
  --server-id edge-02
```

## 显式上游示例

```bash
npx @modeldriveprotocol/server \
  --port 47170 \
  --cluster-mode proxy-required \
  --upstream-url ws://127.0.0.1:47372 \
  --server-id edge-01
```

## 启动输出

CLI 启动后会打印：

- websocket endpoint
- HTTP loop endpoint
- auth endpoint
- metadata probe endpoint
- 当前是 standalone 运行，还是已经挂到上游 hub

## 相关页面

- [部署模式](/zh-Hans/server/deployment)
- [对外接口](/zh-Hans/server/api/)
- [安全](/zh-Hans/server/security)
