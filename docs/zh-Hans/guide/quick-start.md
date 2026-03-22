---
title: 快速开始
status: MVP
---

# 快速开始

## 1. 快速配置

```bash
npx mdp setup
```

如果你的环境里还没有可直接调用的 `mdp` 二进制执行文件，也可以直接运行包入口：

```bash
npx @modeldriveprotocol/server setup
```

如果你想让常见 MCP host 先自动配置起来，直接用上面的 `setup` 命令即可。

如果你要自己逐个 host 配置，继续阅读 [手动安装](/zh-Hans/guide/manual-install)。
如果你要看 server 实际暴露出来的 transport 接口，继续阅读 [对外接口](/zh-Hans/server/api/)。
如果你要启用 TLS 或理解安全端点，继续阅读 [安全](/zh-Hans/server/security)。
如果你要集中了解 standalone、auto 和 proxy-required 这几种拓扑，继续阅读 [部署模式](/zh-Hans/server/deployment)。

## 2. 启动一个 Client

如果你走浏览器路径，最快能跑起来的 client 就是下面这两段 CDN 脚本：

```html
<script src="https://cdn.jsdelivr.net/npm/@modeldriveprotocol/client@latest/dist/modeldriveprotocol-client.global.js"></script>
<script
  src="https://cdn.jsdelivr.net/npm/@modeldriveprotocol/browser-simple-mdp-client@latest/dist/browser-simple-mdp-client.global.js"
  attr-mdp-server-url="ws://127.0.0.1:47372"
  attr-mdp-client-id="browser-simple-01"
  attr-mdp-client-name="Browser Simple Client"
  attr-mdp-client-description="最小浏览器 MDP client"
></script>
```

第一个脚本加载浏览器 SDK bundle。第二个脚本加载预构建好的 `browser-simple-mdp-client` app，它会自动连接并注册一组最小浏览器能力。

如果你想看这个包本身的说明、内置能力和使用方式，继续阅读 [Browser Simple MDP Client](/zh-Hans/apps/browser-simple-mdp-client)。

如果你想直接看这个仓库里部署出来的页面示例，可以打开 [Browser Client](/examples/browser/index.html)。
如果你要看 auth、HTTP loop、浏览器全局 bundle 等更灵活的接入方式，继续阅读[生态 > SDKs > JavaScript](/zh-Hans/sdk/javascript/usage)。
如果你更希望直接从现成运行时集成起步，也可以直接看 [Chrome 插件](/zh-Hans/apps/chrome-extension) 或 [VSCode 插件](/zh-Hans/apps/vscode-extension)。

## 3. 在 Agent 里试试看

当 Agent / IDE 里的 MCP 配置生效、client 也注册完成后，直接和 Agent 对话，试着调用相关工具看看。

例如，可以让 Agent 先列出可用 client，或者直接调用你刚刚暴露的那个 tool。完整的 bridge surface 可继续阅读 [工具集](/zh-Hans/server/tools/)。
