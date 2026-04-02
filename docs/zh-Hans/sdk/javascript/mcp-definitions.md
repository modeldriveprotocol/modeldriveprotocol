---
title: MCP 定义
status: Draft
---

# MCP 定义

在 JavaScript SDK 里，你并不是直接定义 MCP tools。你定义的是 MDP paths，然后由 server 通过固定的 MCP bridge surface 暴露出去。

## Endpoint 定义

普通可调用 endpoint 用 `expose(path, descriptor, handler)`：

```ts
client.expose(
  '/page/search',
  {
    method: 'POST',
    description: 'Search the current page',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' }
      },
      required: ['query']
    }
  },
  async ({ body }, context) => {
    const query = typeof body === 'object' && body !== null && !Array.isArray(body)
      ? String((body as { query?: unknown }).query ?? '')
      : ''

    return {
      query,
      matches: 3,
      authToken: context.auth?.token
    }
  }
)
```

endpoint descriptor 的字段包括：

- `path`
- `method`
- 可选 `description`
- 可选 `inputSchema`
- 可选 `outputSchema`
- 可选 `contentType`

## Prompt 定义

prompt 文档或 prompt builder 使用保留叶子名 `.../prompt.md`：

```ts
client.expose('/selection/summarize/prompt.md', {
  description: 'Build a summarization prompt'
}, async ({ queries }) => ({
  messages: [
    {
      role: 'user',
      content: `Summarize the active selection in a ${queries.tone ?? 'neutral'} tone.`
    }
  ]
}))
```

prompt descriptor 的字段包括：

- `path`
- 可选 `description`
- 可选 `inputSchema`
- 可选 `outputSchema`

## Legacy 包装层

SDK 仍然保留 `exposeTool()`、`exposePrompt()`、`exposeResource()` 这类迁移辅助接口。它们会注册 compat path，并挂上 `legacy` alias，让 MCP bridge 继续为旧 host 提供 `listTools`、`callTools`、`getPrompt`、`readResource`。

新代码优先使用 `expose()` 和 path-native descriptor。

## MCP 侧如何看到这些定义

当前 canonical bridge tools 是：

- `listClients`
- `listPaths`
- `callPath`
- `callPaths`

`listTools`、`callTools`、`listPrompts`、`getPrompt`、`listResources`、`readResource` 这类兼容别名仍然保留，方便迁移期间继续使用。

如果运行时在 `register()` 之后新增或删除 descriptor，先用 `expose()` / `unexpose()` 更新本地 registry，再调用 `syncCatalog()`，让 server 刷新索引后的 path catalog。

底层模型可以继续阅读 [能力模型](/zh-Hans/protocol/capability-model) 和 [MCP Bridge](/zh-Hans/protocol/mcp-bridge)。
