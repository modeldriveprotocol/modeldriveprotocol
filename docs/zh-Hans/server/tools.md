---
title: Tools
status: MVP
---

# Tools

server 对上暴露的是一组固定的 MCP bridge tools，不会为每个已注册 capability 动态生成一套 MCP tools。

## Bridge tool 总览

| Tool | 类别 | 适用场景 | 关键入参 | 返回根字段 |
| --- | --- | --- | --- | --- |
| `listClients` | 发现 | 想看在线 client 和 registry 状态 | 无 | `clients` |
| `listTools` | 发现 | 想看 tool 描述信息 | `clientId?` | `tools` |
| `listPrompts` | 发现 | 想看 prompt 描述信息 | `clientId?` | `prompts` |
| `listSkills` | 发现 | 想看 skill 描述信息 | `clientId?` | `skills` |
| `listResources` | 发现 | 想看 resource 描述信息 | `clientId?` | `resources` |
| `callTools` | 调用 | 已经知道精确的 client 和 tool 名称 | `clientId`、`toolName`、`args?`、`auth?` | `ok`、`data` |
| `getPrompt` | 调用 | 已经知道精确的 client 和 prompt 名称 | `clientId`、`promptName`、`args?`、`auth?` | `ok`、`data` |
| `callSkills` | 调用 | 已经知道精确的 client 和 skill 名称 | `clientId`、`skillName`、`args?`、`auth?` | `ok`、`data` |
| `readResource` | 调用 | 已经知道精确的 client 和 resource URI | `clientId`、`uri`、`args?`、`auth?` | `ok`、`data` |
| `callClients` | 调用 | 想走通用入口或一次打到多个 client | `kind`、`clientIds?`、`name?`、`uri?`、`args?`、`auth?` | `results` |

## 直接用 HTTP 读取 skill

skill 文档也可以直接通过 HTTP 读取：

```bash
curl 'http://127.0.0.1:7070/skills/client-01/workspace/review'
curl 'http://127.0.0.1:7070/client-01/skills/workspace/review/files?topic=mdp' \
  -H 'x-review-scope: focused'
```

这些路由会：

- 按 client ID 和 skill 路径解析一个精确 skill 节点
- 把 URL query 参数传给 skill resolver
- 把请求头传给 skill resolver
- 直接返回 skill 内容，通常是 `text/markdown`

## 这些 tool 怎么返回结果

每个 bridge tool 都会把 JSON 放进 `structuredContent`，同时也会把同样的 JSON 作为文本镜像到 MCP 返回内容里。

常见返回有两种形态。

成功：

```json
{
  "ok": true,
  "data": {}
}
```

失败：

```json
{
  "ok": false,
  "error": {
    "code": "handler_error",
    "message": "Something failed"
  }
}
```

像 `listClients`、`listTools` 这种发现类 tools，不会包一层 `ok` 和 `data`，而是直接返回数组字段。

## 共享输入类型

### `auth`

调用型 tools 支持一个可选的 `auth` 对象：

```json
{
  "scheme": "Bearer",
  "token": "client-session-token",
  "headers": {
    "x-mdp-auth-tenant": "demo"
  },
  "metadata": {
    "role": "operator"
  }
}
```

server 会把它原样下发给目标 client，体现在 `callClient.auth` 中。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `scheme` | `string` | 否 | 认证方案，例如 `Bearer`。 |
| `token` | `string` | 否 | 下发给 client 的 token 或凭据值。 |
| `headers` | `Record<string, string>` | 否 | 下发给 client 的额外认证 header。 |
| `metadata` | `Record<string, unknown>` | 否 | 下发给 client 的任意认证上下文。 |

### `args`

`args` 是一个可选 JSON 对象：

```json
{
  "query": "mdp",
  "limit": 10
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `args` | `Record<string, unknown>` | 否 | 原样传给目标 client handler 的自由 JSON 对象。 |

## 共享输出类型

### Listed client

`listClients` 返回的是 `ListedClient[]`。单个元素长这样：

```json
{
  "id": "browser-01",
  "name": "Browser Client",
  "tools": [
    {
      "name": "searchDom",
      "description": "Search the page"
    }
  ],
  "prompts": [],
  "skills": [],
  "resources": [],
  "status": "online",
  "connectedAt": "2026-03-20T00:00:00.000Z",
  "lastSeenAt": "2026-03-20T00:05:00.000Z",
  "connection": {
    "mode": "ws",
    "secure": false,
    "authSource": "none"
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 运行时注册的 client ID。 |
| `name` | `string` | 是 | 面向人的 client 名称。 |
| `description` | `string` | 否 | 可选的 client 描述。 |
| `version` | `string` | 否 | 可选的版本号。 |
| `platform` | `string` | 否 | 可选的平台标识。 |
| `metadata` | `Record<string, unknown>` | 否 | client 自定义元数据。 |
| `tools` | `ToolDescriptor[]` | 是 | 当前注册的 tool 描述列表。 |
| `prompts` | `PromptDescriptor[]` | 是 | 当前注册的 prompt 描述列表。 |
| `skills` | `SkillDescriptor[]` | 是 | 当前注册的 skill 描述列表。静态 skill 文档通常会带 `contentType: "text/markdown"`。 |
| `resources` | `ResourceDescriptor[]` | 是 | 当前注册的 resource 描述列表。 |
| `status` | `"online"` | 是 | 当前实现只返回在线 client。 |
| `connectedAt` | `string` | 是 | 首次建连时间，ISO-8601。 |
| `lastSeenAt` | `string` | 是 | 最近一次心跳或消息时间，ISO-8601。 |
| `connection` | `ClientConnectionDescriptor` | 是 | 连接元数据，见下表。 |

`connection.mode` 只会是 `ws` 或 `http-loop`。

`connection.authSource` 只会是：

- `none`
- `message`
- `transport`
- `transport+message`

| `connection` 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `mode` | `"ws" \| "http-loop"` | 是 | 当前 client 会话使用的 transport。 |
| `secure` | `boolean` | 是 | 当前 transport 是否启用了 TLS。 |
| `authSource` | `"none" \| "message" \| "transport" \| "transport+message"` | 是 | server 观察到 auth 的来源。 |

### 索引后的 descriptor

`list*` 这类 capability tools 返回的 descriptor，都会额外带上 `clientId` 和 `clientName`。

Tool descriptor：

```json
{
  "clientId": "browser-01",
  "clientName": "Browser Client",
  "name": "searchDom",
  "description": "Search the page",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string"
      }
    }
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `clientId` | `string` | 是 | 暴露该 tool 的 client ID。 |
| `clientName` | `string` | 是 | 暴露该 tool 的 client 名称。 |
| `name` | `string` | 是 | 调用时使用的 tool 名称。 |
| `description` | `string` | 否 | tool 的说明文字。 |
| `inputSchema` | `Record<string, unknown>` | 否 | 可选的 JSON Schema 风格入参定义。 |

Prompt descriptor：

```json
{
  "clientId": "browser-01",
  "clientName": "Browser Client",
  "name": "summarizeSelection",
  "description": "Build a summary prompt",
  "arguments": [
    {
      "name": "tone",
      "description": "Summary tone",
      "required": false
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `clientId` | `string` | 是 | 暴露该 prompt 的 client ID。 |
| `clientName` | `string` | 是 | 暴露该 prompt 的 client 名称。 |
| `name` | `string` | 是 | prompt 名称。 |
| `description` | `string` | 否 | prompt 的说明文字。 |
| `arguments` | `PromptArgumentDescriptor[]` | 否 | 可选的 prompt 参数定义。 |

Skill descriptor：

```json
{
  "clientId": "browser-01",
  "clientName": "Browser Client",
  "name": "page/review",
  "description": "Run a page review workflow",
  "inputSchema": {
    "type": "object"
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `clientId` | `string` | 是 | 暴露该 skill 的 client ID。 |
| `clientName` | `string` | 是 | 暴露该 skill 的 client 名称。 |
| `name` | `string` | 是 | skill 名称。 |
| `description` | `string` | 否 | skill 的说明文字。 |
| `inputSchema` | `Record<string, unknown>` | 否 | 可选的 JSON Schema 风格入参定义。 |

Resource descriptor：

```json
{
  "clientId": "browser-01",
  "clientName": "Browser Client",
  "uri": "webpage://active-tab/page-info",
  "name": "Current Page Info",
  "mimeType": "application/json"
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `clientId` | `string` | 是 | 暴露该 resource 的 client ID。 |
| `clientName` | `string` | 是 | 暴露该 resource 的 client 名称。 |
| `uri` | `string` | 是 | 用于读取 resource 的 URI。 |
| `name` | `string` | 是 | 面向人的 resource 名称。 |
| `description` | `string` | 否 | resource 的说明文字。 |
| `mimeType` | `string` | 否 | 可选的 MIME type。 |

## 共享调用返回字段

调用成功时：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `ok` | `true` | 表示 client handler 成功执行。 |
| `data` | `unknown` | 目标 client handler 返回的 payload。 |

调用失败时：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `ok` | `false` | 表示 client handler 执行失败。 |
| `error.code` | `string` | 协议错误码，client 执行失败时通常是 `handler_error`。 |
| `error.message` | `string` | 面向人的失败原因。 |
| `error.details` | `unknown` | 可选的结构化错误细节。 |

## 发现类 tools

### `listClients`

| 入参字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| 无 | - | - | `listClients` 不接收入参。 |

输入：

```json
{}
```

输出：

```json
{
  "clients": []
}
```

| 出参字段 | 类型 | 说明 |
| --- | --- | --- |
| `clients` | `ListedClient[]` | 在线 client 及其 capability 摘要。 |

### `listTools`

| 入参字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `clientId` | `string` | 否 | 只看某个 client 的 tool。省略时返回所有在线 client 的 tool。 |

输入：

```json
{
  "clientId": "browser-01"
}
```

`clientId` 是可选的。省略时，server 会列出所有在线 client 的 tool。

输出：

```json
{
  "tools": []
}
```

| 出参字段 | 类型 | 说明 |
| --- | --- | --- |
| `tools` | `IndexedToolDescriptor[]` | 带 `clientId` 和 `clientName` 的 tool 描述列表。 |

### `listPrompts`

| 入参字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `clientId` | `string` | 否 | 只看某个 client 的 prompt。省略时返回所有在线 client 的 prompt。 |

输入：

```json
{
  "clientId": "browser-01"
}
```

输出：

```json
{
  "prompts": []
}
```

| 出参字段 | 类型 | 说明 |
| --- | --- | --- |
| `prompts` | `IndexedPromptDescriptor[]` | 带 `clientId` 和 `clientName` 的 prompt 描述列表。 |

### `listSkills`

| 入参字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `clientId` | `string` | 否 | 只看某个 client 的 skill。省略时返回所有在线 client 的 skill。 |

输入：

```json
{
  "clientId": "browser-01"
}
```

输出：

```json
{
  "skills": []
}
```

| 出参字段 | 类型 | 说明 |
| --- | --- | --- |
| `skills` | `IndexedSkillDescriptor[]` | 带 `clientId` 和 `clientName` 的 skill 描述列表。可以通过分层 skill 名称完成渐进式披露。 |

### `listResources`

| 入参字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `clientId` | `string` | 否 | 只看某个 client 的 resource。省略时返回所有在线 client 的 resource。 |

输入：

```json
{
  "clientId": "browser-01"
}
```

输出：

```json
{
  "resources": []
}
```

| 出参字段 | 类型 | 说明 |
| --- | --- | --- |
| `resources` | `IndexedResourceDescriptor[]` | 带 `clientId` 和 `clientName` 的 resource 描述列表。 |

## 调用类 tools

### `callTools`

| 入参字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `clientId` | `string` | 是 | 目标 client ID。 |
| `toolName` | `string` | 是 | 目标 tool 名称。 |
| `args` | `Record<string, unknown>` | 否 | 传给 tool handler 的参数。 |
| `auth` | `AuthContext` | 否 | 作为 `callClient.auth` 下发给 client 的认证上下文。 |

输入：

```json
{
  "clientId": "browser-01",
  "toolName": "searchDom",
  "args": {
    "query": "mdp"
  },
  "auth": {
    "token": "host-token"
  }
}
```

成功输出：

```json
{
  "ok": true,
  "data": {
    "query": "mdp",
    "matches": 3
  }
}
```

| 出参字段 | 类型 | 说明 |
| --- | --- | --- |
| `ok` | `boolean` | 成功时为 `true`，失败时为 `false`。 |
| `data` | `unknown` | tool handler 返回的 payload。 |
| `error` | `SerializedError` | 仅失败时出现。 |

### `getPrompt`

| 入参字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `clientId` | `string` | 是 | 目标 client ID。 |
| `promptName` | `string` | 是 | 目标 prompt 名称。 |
| `args` | `Record<string, unknown>` | 否 | 传给 prompt handler 的参数。 |
| `auth` | `AuthContext` | 否 | 作为 `callClient.auth` 下发给 client 的认证上下文。 |

输入：

```json
{
  "clientId": "browser-01",
  "promptName": "summarizeSelection",
  "args": {
    "tone": "concise"
  }
}
```

成功输出：

```json
{
  "ok": true,
  "data": {
    "messages": [
      {
        "role": "user",
        "content": "Summarize the active selection."
      }
    ]
  }
}
```

| 出参字段 | 类型 | 说明 |
| --- | --- | --- |
| `ok` | `boolean` | 成功时为 `true`，失败时为 `false`。 |
| `data` | `unknown` | prompt handler 返回的 payload，常见是 prompt message 结构。 |
| `error` | `SerializedError` | 仅失败时出现。 |

### `callSkills`

| 入参字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `clientId` | `string` | 是 | 目标 client ID。 |
| `skillName` | `string` | 是 | 目标 skill 名称。 |
| `args` | `Record<string, unknown>` | 否 | 传给 skill handler 的参数。静态 Markdown skill 通常会忽略这个字段。 |
| `auth` | `AuthContext` | 否 | 作为 `callClient.auth` 下发给 client 的认证上下文。 |

输入：

```json
{
  "clientId": "browser-01",
  "skillName": "workspace/review"
}
```

成功输出：

```json
{
  "ok": true,
  "data": "# Workspace Review\n\nReview the workspace root.\n\nYou can read `workspace/review/files` for file-level guidance."
}
```

| 出参字段 | 类型 | 说明 |
| --- | --- | --- |
| `ok` | `boolean` | 成功时为 `true`，失败时为 `false`。 |
| `data` | `unknown` | skill handler 返回的 payload。对静态 skill 文档来说，这里通常就是 Markdown 文本。 |
| `error` | `SerializedError` | 仅失败时出现。 |

### `readResource`

| 入参字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `clientId` | `string` | 是 | 目标 client ID。 |
| `uri` | `string` | 是 | 要读取的 resource URI。 |
| `args` | `Record<string, unknown>` | 否 | 可选的读取参数。 |
| `auth` | `AuthContext` | 否 | 作为 `callClient.auth` 下发给 client 的认证上下文。 |

输入：

```json
{
  "clientId": "browser-01",
  "uri": "webpage://active-tab/page-info"
}
```

成功输出：

```json
{
  "ok": true,
  "data": {
    "mimeType": "application/json",
    "text": "{\"title\":\"MDP\"}"
  }
}
```

| 出参字段 | 类型 | 说明 |
| --- | --- | --- |
| `ok` | `boolean` | 成功时为 `true`，失败时为 `false`。 |
| `data` | `unknown` | resource handler 返回的 payload，常见是 `mimeType` 加 `text`。 |
| `error` | `SerializedError` | 仅失败时出现。 |

### `callClients`

| 入参字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `clientIds` | `string[]` | 否 | 显式指定目标 client。省略时 server 会按 capability 自动匹配。 |
| `kind` | `"tool" \| "prompt" \| "skill" \| "resource"` | 是 | 要调用的 capability 类型。 |
| `name` | `string` | 条件必填 | 对 `tool`、`prompt`、`skill` 必填。 |
| `uri` | `string` | 条件必填 | 对 `resource` 必填。 |
| `args` | `Record<string, unknown>` | 否 | 传给每个命中 client handler 的参数。 |
| `auth` | `AuthContext` | 否 | 作为 `callClient.auth` 下发给 client 的认证上下文。 |

`callClients` 是通用桥接工具，可以一次打到一个或多个 client。

输入：

```json
{
  "clientIds": ["browser-01", "browser-02"],
  "kind": "tool",
  "name": "searchDom",
  "args": {
    "query": "mdp"
  }
}
```

`clientIds` 是可选的。如果省略，server 会按照 `kind` 再结合：

- `tool` / `prompt` / `skill` 用 `name`
- `resource` 用 `uri`

去自动匹配 client。

成功输出：

```json
{
  "results": [
    {
      "clientId": "browser-01",
      "ok": true,
      "data": {
        "matches": 3
      }
    },
    {
      "clientId": "browser-02",
      "ok": false,
      "error": {
        "code": "handler_error",
        "message": "DOM not ready"
      }
    }
  ]
}
```

| 出参字段 | 类型 | 说明 |
| --- | --- | --- |
| `results` | `Array<{ clientId: string; ok: boolean; data?: unknown; error?: SerializedError }>` | 每个目标 client 对应一个结果项。 |

如果没有任何 client 匹配，返回：

```json
{
  "ok": false,
  "error": "No matching MDP clients were found"
}
```

| 错误字段 | 类型 | 说明 |
| --- | --- | --- |
| `ok` | `false` | 表示 server 没有找到匹配的 client。 |
| `error` | `string` | 面向人的 server 侧路由错误。 |

## 什么时候用哪个 tool

- 想看连接状态和 registry，用 `listClients`
- 已经知道 capability kind，用 `listTools`、`listPrompts`、`listSkills`、`listResources`
- 已经知道目标 client，用 `callTools`、`getPrompt`、`callSkills`、`readResource`
- 想走一个通用入口，或者要 fan-out 到多个 client，用 `callClients`

## 常见任务模式

### 1. 先看一个新连上的 client 到底有什么能力

先列出 clients：

```json
{}
```

再看某一类 capability：

```json
{
  "clientId": "browser-01"
}
```

这通常对应：

- `listClients`
- 然后按需调用 `listTools`、`listPrompts`、`listSkills`、`listResources`

### 2. 已经知道 client 和 tool，直接调用

如果你已经明确知道 client ID 和 tool 名称，直接用 `callTools`：

```json
{
  "clientId": "browser-01",
  "toolName": "searchDom",
  "args": {
    "query": "mdp"
  }
}
```

### 3. 想把同一个调用 fan-out 到多个 client

如果多个 client 可能都暴露了同名 capability，用 `callClients`：

```json
{
  "kind": "tool",
  "name": "searchDom",
  "args": {
    "query": "mdp"
  }
}
```

当你省略 `clientIds` 时，server 会自动匹配所有暴露了该 capability 的在线 client。

### 4. 读取 resource，而不是调用 tool

如果目标是按 URI 标识的资源，用 `readResource`：

```json
{
  "clientId": "browser-01",
  "uri": "webpage://active-tab/page-info"
}
```

### 5. 拿 prompt 或 skill 文档，而不是直接函数调用

这时分别用：

- `getPrompt` 处理 prompt template 或 prompt builder
- `callSkills` 处理 skill 文档或动态 skill 解析器

这两个 tool 仍然会把 client 自己定义的 payload 放在 `data` 里返回。

底层消息格式可继续阅读 [protocol](/zh-Hans/server/protocol) 和 [消息模型](/zh-Hans/protocol/message-schema)。
