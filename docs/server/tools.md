---
title: Tools
status: MVP
---

# Tools

The server exposes a fixed MCP bridge surface. It does not generate one MCP tool per registered capability.

## Bridge tool catalog

| Tool | Category | Use when | Key input fields | Output root |
| --- | --- | --- | --- | --- |
| `listClients` | Discovery | You want connected client and registry state | None | `clients` |
| `listTools` | Discovery | You want indexed tool descriptors | `clientId?` | `tools` |
| `listPrompts` | Discovery | You want indexed prompt descriptors | `clientId?` | `prompts` |
| `listSkills` | Discovery | You want indexed skill descriptors | `clientId?` | `skills` |
| `listResources` | Discovery | You want indexed resource descriptors | `clientId?` | `resources` |
| `callTools` | Invocation | You know the exact client and tool name | `clientId`, `toolName`, `args?`, `auth?` | `ok`, `data` |
| `getPrompt` | Invocation | You know the exact client and prompt name | `clientId`, `promptName`, `args?`, `auth?` | `ok`, `data` |
| `callSkills` | Invocation | You know the exact client and skill name | `clientId`, `skillName`, `args?`, `auth?` | `ok`, `data` |
| `readResource` | Invocation | You know the exact client and resource URI | `clientId`, `uri`, `args?`, `auth?` | `ok`, `data` |
| `callClients` | Invocation | You want one generic entry point or fan-out routing | `kind`, `clientIds?`, `name?`, `uri?`, `args?`, `auth?` | `results` |

## Direct HTTP skill reads

Skill documents can also be read directly over HTTP:

```bash
curl 'http://127.0.0.1:7070/skills/client-01/workspace/review'
curl 'http://127.0.0.1:7070/client-01/skills/workspace/review/files?topic=mdp' \
  -H 'x-review-scope: focused'
```

Those routes:

- resolve one exact skill node by client ID and skill path
- pass URL query parameters to the skill resolver
- pass request headers to the skill resolver
- return the skill body directly, commonly as `text/markdown`

## How tool results are returned

Each bridge tool returns JSON in `structuredContent`. The same JSON is also mirrored as a text block in the MCP response body.

There are two common result shapes:

Success:

```json
{
  "ok": true,
  "data": {}
}
```

Error:

```json
{
  "ok": false,
  "error": {
    "code": "handler_error",
    "message": "Something failed"
  }
}
```

Discovery tools such as `listClients` or `listTools` return arrays directly instead of wrapping them in `ok` and `data`.

## Shared input types

### `auth`

Invocation-oriented tools accept an optional `auth` object:

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

The server forwards that payload to the target client as `callClient.auth`.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `scheme` | `string` | No | Auth scheme such as `Bearer`. |
| `token` | `string` | No | Token or credential value forwarded to the client. |
| `headers` | `Record<string, string>` | No | Extra auth-related headers forwarded to the client. |
| `metadata` | `Record<string, unknown>` | No | Arbitrary auth context forwarded to the client. |

### `args`

`args` is an optional JSON object:

```json
{
  "query": "mdp",
  "limit": 10
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `args` | `Record<string, unknown>` | No | Free-form JSON object passed through to the target client handler. |

## Shared output types

### Listed client

`listClients` returns `ListedClient[]`. Each item looks like:

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

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Yes | Client ID registered by the runtime. |
| `name` | `string` | Yes | Human-readable client name. |
| `description` | `string` | No | Optional client description. |
| `version` | `string` | No | Optional client version. |
| `platform` | `string` | No | Optional runtime platform label. |
| `metadata` | `Record<string, unknown>` | No | Optional client-defined metadata. |
| `tools` | `ToolDescriptor[]` | Yes | Tool descriptors currently registered by the client. |
| `prompts` | `PromptDescriptor[]` | Yes | Prompt descriptors currently registered by the client. |
| `skills` | `SkillDescriptor[]` | Yes | Skill descriptors currently registered by the client. Static skill documents typically expose `contentType: "text/markdown"`. |
| `resources` | `ResourceDescriptor[]` | Yes | Resource descriptors currently registered by the client. |
| `status` | `"online"` | Yes | Current implementation only lists online clients. |
| `connectedAt` | `string` | Yes | ISO-8601 timestamp for initial connection time. |
| `lastSeenAt` | `string` | Yes | ISO-8601 timestamp for the last heartbeat or message. |
| `connection` | `ClientConnectionDescriptor` | Yes | Connection metadata described below. |

`connection.mode` is `ws` or `http-loop`.

`connection.authSource` is one of:

- `none`
- `message`
- `transport`
- `transport+message`

| `connection` field | Type | Required | Description |
| --- | --- | --- | --- |
| `mode` | `"ws" \| "http-loop"` | Yes | Active transport mode for the client session. |
| `secure` | `boolean` | Yes | Whether the transport is running over TLS. |
| `authSource` | `"none" \| "message" \| "transport" \| "transport+message"` | Yes | Where the server observed auth for this connection. |

### Indexed descriptors

The `list*` capability tools return descriptors with `clientId` and `clientName` attached.

Tool descriptor:

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

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `clientId` | `string` | Yes | ID of the client that exposed the tool. |
| `clientName` | `string` | Yes | Name of the client that exposed the tool. |
| `name` | `string` | Yes | Tool name used for invocation. |
| `description` | `string` | No | Human-readable tool description. |
| `inputSchema` | `Record<string, unknown>` | No | Optional JSON Schema-like input definition. |

Prompt descriptor:

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

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `clientId` | `string` | Yes | ID of the client that exposed the prompt. |
| `clientName` | `string` | Yes | Name of the client that exposed the prompt. |
| `name` | `string` | Yes | Prompt name used for lookup. |
| `description` | `string` | No | Human-readable prompt description. |
| `arguments` | `PromptArgumentDescriptor[]` | No | Optional prompt argument descriptors. |

Skill descriptor:

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

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `clientId` | `string` | Yes | ID of the client that exposed the skill. |
| `clientName` | `string` | Yes | Name of the client that exposed the skill. |
| `name` | `string` | Yes | Skill name used for invocation. |
| `description` | `string` | No | Human-readable skill description. |
| `inputSchema` | `Record<string, unknown>` | No | Optional JSON Schema-like input definition. |

Resource descriptor:

```json
{
  "clientId": "browser-01",
  "clientName": "Browser Client",
  "uri": "webpage://active-tab/page-info",
  "name": "Current Page Info",
  "mimeType": "application/json"
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `clientId` | `string` | Yes | ID of the client that exposed the resource. |
| `clientName` | `string` | Yes | Name of the client that exposed the resource. |
| `uri` | `string` | Yes | Resource URI used for lookup. |
| `name` | `string` | Yes | Human-readable resource name. |
| `description` | `string` | No | Human-readable resource description. |
| `mimeType` | `string` | No | Optional MIME type for the resource payload. |

## Shared invocation result fields

Successful invocation tools return:

| Field | Type | Description |
| --- | --- | --- |
| `ok` | `true` | Indicates the client handler succeeded. |
| `data` | `unknown` | Payload returned by the target client handler. |

Failed invocation tools return:

| Field | Type | Description |
| --- | --- | --- |
| `ok` | `false` | Indicates the client handler failed. |
| `error.code` | `string` | One of the protocol error codes, typically `handler_error` for client-side failures. |
| `error.message` | `string` | Human-readable failure reason. |
| `error.details` | `unknown` | Optional structured error details. |

## Discovery tools

### `listClients`

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| None | - | - | `listClients` takes no input fields. |

Input:

```json
{}
```

Output:

```json
{
  "clients": []
}
```

| Output field | Type | Description |
| --- | --- | --- |
| `clients` | `ListedClient[]` | Connected clients and their registered capability summaries. |

### `listTools`

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| `clientId` | `string` | No | Filter tool descriptors to one client. If omitted, returns tools from every connected client. |

Input:

```json
{
  "clientId": "browser-01"
}
```

`clientId` is optional. If omitted, the server lists tools from every connected client.

Output:

```json
{
  "tools": []
}
```

| Output field | Type | Description |
| --- | --- | --- |
| `tools` | `IndexedToolDescriptor[]` | Indexed tool descriptors with `clientId` and `clientName`. |

### `listPrompts`

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| `clientId` | `string` | No | Filter prompt descriptors to one client. If omitted, returns prompts from every connected client. |

Input:

```json
{
  "clientId": "browser-01"
}
```

Output:

```json
{
  "prompts": []
}
```

| Output field | Type | Description |
| --- | --- | --- |
| `prompts` | `IndexedPromptDescriptor[]` | Indexed prompt descriptors with `clientId` and `clientName`. |

### `listSkills`

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| `clientId` | `string` | No | Filter skill descriptors to one client. If omitted, returns skills from every connected client. |

Input:

```json
{
  "clientId": "browser-01"
}
```

Output:

```json
{
  "skills": []
}
```

| Output field | Type | Description |
| --- | --- | --- |
| `skills` | `IndexedSkillDescriptor[]` | Indexed skill descriptors with `clientId` and `clientName`. Hierarchical skill names can be used for progressive disclosure. |

### `listResources`

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| `clientId` | `string` | No | Filter resource descriptors to one client. If omitted, returns resources from every connected client. |

Input:

```json
{
  "clientId": "browser-01"
}
```

Output:

```json
{
  "resources": []
}
```

| Output field | Type | Description |
| --- | --- | --- |
| `resources` | `IndexedResourceDescriptor[]` | Indexed resource descriptors with `clientId` and `clientName`. |

## Invocation tools

### `callTools`

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| `clientId` | `string` | Yes | Target client ID. |
| `toolName` | `string` | Yes | Target tool name. |
| `args` | `Record<string, unknown>` | No | Arguments passed to the tool handler. |
| `auth` | `AuthContext` | No | Auth context forwarded as `callClient.auth`. |

Input:

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

Success output:

```json
{
  "ok": true,
  "data": {
    "query": "mdp",
    "matches": 3
  }
}
```

| Output field | Type | Description |
| --- | --- | --- |
| `ok` | `boolean` | `true` on success, `false` on failure. |
| `data` | `unknown` | Payload returned by the tool handler. |
| `error` | `SerializedError` | Present only on failure. |

### `getPrompt`

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| `clientId` | `string` | Yes | Target client ID. |
| `promptName` | `string` | Yes | Target prompt name. |
| `args` | `Record<string, unknown>` | No | Arguments passed to the prompt handler. |
| `auth` | `AuthContext` | No | Auth context forwarded as `callClient.auth`. |

Input:

```json
{
  "clientId": "browser-01",
  "promptName": "summarizeSelection",
  "args": {
    "tone": "concise"
  }
}
```

Success output:

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

| Output field | Type | Description |
| --- | --- | --- |
| `ok` | `boolean` | `true` on success, `false` on failure. |
| `data` | `unknown` | Payload returned by the prompt handler, commonly a prompt message structure. |
| `error` | `SerializedError` | Present only on failure. |

### `callSkills`

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| `clientId` | `string` | Yes | Target client ID. |
| `skillName` | `string` | Yes | Target skill name. |
| `args` | `Record<string, unknown>` | No | Arguments passed to the skill handler. Static Markdown skills usually ignore this field. |
| `auth` | `AuthContext` | No | Auth context forwarded as `callClient.auth`. |

Input:

```json
{
  "clientId": "browser-01",
  "skillName": "workspace/review"
}
```

Success output:

```json
{
  "ok": true,
  "data": "# Workspace Review\n\nReview the workspace root.\n\nYou can read `workspace/review/files` for file-level guidance."
}
```

| Output field | Type | Description |
| --- | --- | --- |
| `ok` | `boolean` | `true` on success, `false` on failure. |
| `data` | `unknown` | Payload returned by the skill handler. For static skill documents this is commonly Markdown text. |
| `error` | `SerializedError` | Present only on failure. |

### `readResource`

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| `clientId` | `string` | Yes | Target client ID. |
| `uri` | `string` | Yes | Resource URI to read. |
| `args` | `Record<string, unknown>` | No | Optional read arguments passed to the resource handler. |
| `auth` | `AuthContext` | No | Auth context forwarded as `callClient.auth`. |

Input:

```json
{
  "clientId": "browser-01",
  "uri": "webpage://active-tab/page-info"
}
```

Success output:

```json
{
  "ok": true,
  "data": {
    "mimeType": "application/json",
    "text": "{\"title\":\"MDP\"}"
  }
}
```

| Output field | Type | Description |
| --- | --- | --- |
| `ok` | `boolean` | `true` on success, `false` on failure. |
| `data` | `unknown` | Payload returned by the resource handler, commonly `mimeType` plus `text` or binary-safe content. |
| `error` | `SerializedError` | Present only on failure. |

### `callClients`

| Input field | Type | Required | Description |
| --- | --- | --- | --- |
| `clientIds` | `string[]` | No | Explicit target clients. If omitted, the server auto-matches by capability. |
| `kind` | `"tool" \| "prompt" \| "skill" \| "resource"` | Yes | Capability kind to invoke. |
| `name` | `string` | Conditional | Required for `tool`, `prompt`, and `skill`. |
| `uri` | `string` | Conditional | Required for `resource`. |
| `args` | `Record<string, unknown>` | No | Arguments passed to each matched client handler. |
| `auth` | `AuthContext` | No | Auth context forwarded as `callClient.auth`. |

`callClients` is the generic bridge tool. It can target one or many clients.

Input:

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

`clientIds` is optional. If you omit it, the server finds matching clients by `kind` plus:

- `name` for `tool`, `prompt`, or `skill`
- `uri` for `resource`

Success output:

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

| Output field | Type | Description |
| --- | --- | --- |
| `results` | `Array<{ clientId: string; ok: boolean; data?: unknown; error?: SerializedError }>` | One result item per targeted client. |

If no clients match, the tool returns:

```json
{
  "ok": false,
  "error": "No matching MDP clients were found"
}
```

| Error field | Type | Description |
| --- | --- | --- |
| `ok` | `false` | Indicates the server could not find any matching clients. |
| `error` | `string` | Human-readable server-side routing error. |

## When to use which tool

- Use `listClients` when you need connection and registry state.
- Use `listTools`, `listPrompts`, `listSkills`, and `listResources` when you already know the capability kind.
- Use `callTools`, `getPrompt`, `callSkills`, and `readResource` when you already know the exact target client.
- Use `callClients` when you want one generic entry point or fan-out across multiple clients.

## Common task patterns

### 1. Discover what a newly connected client can do

First list clients:

```json
{}
```

Then inspect one capability category:

```json
{
  "clientId": "browser-01"
}
```

That pattern maps to:

- `listClients`
- then one or more of `listTools`, `listPrompts`, `listSkills`, `listResources`

### 2. Call one known tool on one known client

Use `callTools` when you already know both the client ID and the tool name:

```json
{
  "clientId": "browser-01",
  "toolName": "searchDom",
  "args": {
    "query": "mdp"
  }
}
```

### 3. Fan out the same call across multiple clients

Use `callClients` when the same capability name may exist on more than one client:

```json
{
  "kind": "tool",
  "name": "searchDom",
  "args": {
    "query": "mdp"
  }
}
```

If you omit `clientIds`, the server auto-matches all connected clients that expose that capability.

### 4. Read a resource instead of calling a tool

Use `readResource` when the target is identified by URI rather than capability name:

```json
{
  "clientId": "browser-01",
  "uri": "webpage://active-tab/page-info"
}
```

### 5. Ask for a prompt or skill document rather than a direct function

Use:

- `getPrompt` for prompt templates or prompt builders
- `callSkills` for skill documents or dynamic skill resolvers

Those tools still return the client-defined payload in `data`.

For the underlying wire messages, continue with [Protocol](/server/protocol) and [Message Schema](/protocol/message-schema).
