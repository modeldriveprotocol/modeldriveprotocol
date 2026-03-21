---
title: MCP 定义
status: Draft
---

# MCP 定义

在 JavaScript SDK 里，你并不是直接定义 MCP tools。你定义的是 MDP capability metadata，然后由 server 通过固定的 MCP bridge surface 暴露出去。

## Tool 定义

用 `exposeTool(name, handler, options?)` 暴露一个可调用 tool：

```ts
client.exposeTool('searchDom', async ({ query }, context) => ({
  query,
  matches: 3,
  authToken: context.auth?.token
}), {
  description: 'Search the current page',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' }
    },
    required: ['query']
  }
})
```

它对应的 descriptor 字段是：

- `name`
- 可选 `description`
- 可选 `inputSchema`

## Prompt 定义

用 `exposePrompt(name, handler, options?)` 暴露 prompt 模板或 prompt builder：

```ts
client.exposePrompt('summarizeSelection', async () => ({
  messages: [{ role: 'user', content: 'Summarize the active selection.' }]
}), {
  description: 'Build a summarization prompt',
  arguments: [
    {
      name: 'tone',
      description: 'Desired summary tone',
      required: false
    }
  ]
})
```

它对应的元数据是：

- `name`
- 可选 `description`
- 可选 `arguments`

## Resource 定义

用 `exposeResource(uri, handler, options)` 暴露可读的运行时状态：

```ts
client.exposeResource('webpage://active-tab/page-info', async () => ({
  mimeType: 'application/json',
  text: JSON.stringify(
    {
      title: document.title,
      url: window.location.href
    },
    null,
    2
  )
}), {
  name: 'Current Page Info',
  mimeType: 'application/json'
})
```

它对应的元数据是：

- `uri`
- `name`
- 可选 `description`
- 可选 `mimeType`

## MCP 侧如何看到这些定义

server 会通过固定 bridge tools 暴露这些定义，例如 `listTools`、`callTools`、`listPrompts`、`getPrompt`、`listResources`、`readResource`。

底层模型可以继续阅读 [能力模型](/zh-Hans/protocol/capability-model) 和 [MCP Bridge](/zh-Hans/protocol/mcp-bridge)。
