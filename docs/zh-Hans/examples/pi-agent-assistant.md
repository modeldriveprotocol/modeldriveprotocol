---
title: Pi Agent Assistant
status: MVP
---

# Pi Agent Assistant

这个示例展示了一种把 MDP 和 [`pi-mono`](https://github.com/badlogic/pi-mono) 组合起来的具体方式：

- [`pi-agent-core`](https://github.com/badlogic/pi-mono/tree/main/packages/agent) 负责 agent loop、状态和 tool execution
- [`pi-web-ui`](https://github.com/badlogic/pi-mono/tree/main/packages/web-ui) 适合承载完整聊天界面
- MDP 负责 capability registration 和 runtime routing，让 agent 能通过固定 bridge 调用浏览器里的本地能力

## 这个 example app 做了什么

浏览器页面在本地维护一个小型 support inbox，并通过 MDP 暴露这些能力：

- tools：`listTickets`、`getTicket`、`saveDraft`
- prompt：`replyTicket`
- skill：`support/reply-workflow`
- resources：`inbox://support/playbook`、`inbox://support/open-queue`

Pi agent runner 会启动本地 MDP server，等待浏览器 runtime 完成注册，再通过 MCP bridge tools 去调用这些浏览器侧能力。

```mermaid
flowchart LR
  user["操作员"] --> ui["Pi 聊天界面 / runner"]
  ui --> agent["pi-agent-core Agent"]
  agent --> mcp["MCP client"]
  mcp --> bridge["MDP bridge server"]
  bridge --> runtime["浏览器 runtime client"]
  runtime --> inbox["本地 inbox 状态与草稿"]
```

## 文件

- 运行中的 runtime 页面：[/examples/pi-agent-assistant/index.html](/examples/pi-agent-assistant/index.html)
- 浏览器 runtime 源码：[/examples/pi-agent-assistant/index.html](/examples/pi-agent-assistant/index.html)
- Pi agent runner：[/examples/pi-agent-assistant/agent-runner.mjs](/examples/pi-agent-assistant/agent-runner.mjs)
- 示例本地 `package.json`：[/examples/pi-agent-assistant/package.json](/examples/pi-agent-assistant/package.json)

## 为什么这个拆分合理

Pi 本身就把 agent 状态管理与 UI 渲染分开，这和 MDP 的边界很匹配：

- Pi 负责推理循环、流式事件和工具编排
- MDP 负责运行时能力的注册和路由
- 浏览器 runtime 继续持有本地数据，只在 agent 真正需要时再暴露出去

这样 agent 可以保持通用，而浏览器、IDE 或本地应用继续做能力拥有者。

## 运行方式

先在仓库根目录执行：

```bash
pnpm build
```

然后进入示例目录：

```bash
cd examples/pi-agent-assistant
npm install
npm run start:web
```

打开 `http://127.0.0.1:4173` 并保持页面开启，再在另一个终端执行：

```bash
export OPENAI_API_KEY=...
npm run start:agent -- "Review open tickets, read the playbook, and save a calm reply draft for the most urgent unresolved ticket."
```

runner 默认使用 `openai/gpt-4o-mini`。如果你要换成其他 Pi 支持的模型，可通过 `PI_MODEL_PROVIDER` 和 `PI_MODEL_ID` 覆盖。
