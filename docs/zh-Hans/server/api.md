---
title: APIs
status: Draft
---

# APIs

server 实际上有三层对外 surface：

- 面向 MCP host 的 bridge tools，见 [Tools](/zh-Hans/server/tools)
- 面向 MDP client 的 transport API
- 主要给浏览器 websocket client 用的 auth bootstrap endpoint

这一页重点说明 transport 和消息格式。

## Surface 总览

| Surface | 面向对象 | 主要入口 | 数据形态 |
| --- | --- | --- | --- |
| MCP bridge | MCP host 和 Agent | `listClients`、`callTools` 等 bridge tools | MCP tool 输入 + JSON `structuredContent` 输出 |
| WebSocket transport | MDP client | `ws://127.0.0.1:7070` | JSON 编码的 MDP message |
| HTTP loop transport | MDP client | `/mdp/http-loop/connect`、`/send`、`/poll`、`/disconnect` | HTTP JSON 请求响应 |
| Auth bootstrap | 浏览器 websocket client | `/mdp/auth` | HTTP 请求 + auth cookie 签发 |

## 共享 JSON 类型

### `AuthContext`

带认证信息的 API 会用这个结构：

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

所有字段都是可选的。空对象会被视为没有 auth。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `scheme` | `string` | 否 | 认证方案，例如 `Bearer`。 |
| `token` | `string` | 否 | token 或凭据值。 |
| `headers` | `Record<string, string>` | 否 | 被 server 捕获或向 client 转发的认证 header。 |
| `metadata` | `Record<string, unknown>` | 否 | 任意结构化认证上下文。 |

### `SerializedError`

调用失败时使用这个结构：

```json
{
  "code": "handler_error",
  "message": "Something failed",
  "details": {
    "reason": "optional"
  }
}
```

当前支持的错误码有：

- `bad_request`
- `not_found`
- `timeout`
- `transport_error`
- `handler_error`
- `not_ready`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `code` | `string` | 是 | 协议错误码。 |
| `message` | `string` | 是 | 面向人的错误描述。 |
| `details` | `unknown` | 否 | 可选的结构化错误细节。 |

### capability kind

`kind` 只会是：

- `tool`
- `prompt`
- `skill`
- `resource`

## Transport 端点总览

| 方法 | 路径 | 调用方 | 用途 | 成功返回 |
| --- | --- | --- | --- | --- |
| `WS` | `/` | WebSocket client | 打开双向 MDP 会话 | WebSocket upgrade |
| `POST` | `/mdp/http-loop/connect` | HTTP loop client | 创建 loop 会话 | `200` + `sessionId` |
| `POST` | `/mdp/http-loop/send` | HTTP loop client | 发送一条 client-to-server MDP message | `202` + `{ "ok": true }` |
| `GET` | `/mdp/http-loop/poll` | HTTP loop client | 拉取一条 server-to-client MDP message | `200` + `message` 或 `204` |
| `POST` | `/mdp/http-loop/disconnect` | HTTP loop client | 关闭 loop 会话 | `204` |
| `POST` | `/mdp/auth` | 浏览器 websocket client | 签发 auth cookie | `204` + `Set-Cookie` |
| `DELETE` | `/mdp/auth` | 浏览器 websocket client | 清空 auth cookie | `204` + `Set-Cookie` |

## Transport 端点

参考 transport server 默认暴露：

- `ws://127.0.0.1:7070`
- `http://127.0.0.1:7070/mdp/http-loop`
- `http://127.0.0.1:7070/mdp/auth`

启用 TLS 后，会变成 `wss://` 和 `https://`。

## WebSocket API

websocket 端点收发的都是 JSON 编码的 MDP message。

### 消息总览

| 消息类型 | 方向 | 用途 |
| --- | --- | --- |
| `registerClient` | Client -> Server | 注册 capability 元数据。 |
| `unregisterClient` | Client -> Server | 注销当前 client 会话。 |
| `callClientResult` | Client -> Server | 返回路由调用结果。 |
| `callClient` | Server -> Client | 调用某个在线 client 的 capability。 |
| `ping` | 双向 | 心跳保活。 |
| `pong` | 双向 | 心跳确认。 |

### client 发给 server 的消息

client 可以发送：

- `registerClient`
- `unregisterClient`
- `callClientResult`
- `ping`
- `pong`

### server 发给 client 的消息

server 可以发送：

- `callClient`
- `ping`
- `pong`

### `registerClient`

```json
{
  "type": "registerClient",
  "client": {
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
    "resources": []
  },
  "auth": {
    "token": "message-token"
  }
}
```

其中 `client` 是一个 `ClientDescriptor`，顶层字段包括：

- `id`
- `name`
- 可选 `description`
- 可选 `version`
- 可选 `platform`
- 可选 `metadata`
- `tools`
- `prompts`
- `skills`
- `resources`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `type` | `"registerClient"` | 是 | 消息类型。 |
| `client` | `ClientDescriptor` | 是 | client 元数据和 capability 描述。 |
| `auth` | `AuthContext` | 否 | 消息级注册认证。 |

`client` 字段说明：

| `client` 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 稳定 client ID。 |
| `name` | `string` | 是 | 面向人的 client 名称。 |
| `description` | `string` | 否 | 可选的 client 描述。 |
| `version` | `string` | 否 | 可选版本号。 |
| `platform` | `string` | 否 | 可选的平台标签。 |
| `metadata` | `Record<string, unknown>` | 否 | client 自定义元数据。 |
| `tools` | `ToolDescriptor[]` | 是 | 已注册的 tool 描述。 |
| `prompts` | `PromptDescriptor[]` | 是 | 已注册的 prompt 描述。 |
| `skills` | `SkillDescriptor[]` | 是 | 已注册的 skill 描述。静态 Markdown skill 通常会带 `contentType: "text/markdown"`。 |
| `resources` | `ResourceDescriptor[]` | 是 | 已注册的 resource 描述。 |

### `callClient`

server 把调用路由给 client 时，消息长这样：

```json
{
  "type": "callClient",
  "requestId": "req-01",
  "clientId": "browser-01",
  "kind": "tool",
  "name": "searchDom",
  "args": {
    "query": "mdp"
  },
  "auth": {
    "token": "host-token"
  }
}
```

规则是：

- `tool`、`prompt`、`skill` 用 `name`
- `resource` 用 `uri`
- `args` 可选
- `auth` 可选

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `type` | `"callClient"` | 是 | 消息类型。 |
| `requestId` | `string` | 是 | 请求关联 ID。 |
| `clientId` | `string` | 是 | 目标 client ID。 |
| `kind` | `"tool" \| "prompt" \| "skill" \| "resource"` | 是 | 要调用的 capability 类型。 |
| `name` | `string` | 条件必填 | 对 `tool`、`prompt`、`skill` 必填。 |
| `uri` | `string` | 条件必填 | 对 `resource` 必填。 |
| `args` | `Record<string, unknown>` | 否 | 传给 client handler 的参数。 |
| `auth` | `AuthContext` | 否 | 向 client 下发的调用认证上下文。 |

### `callClientResult`

成功：

```json
{
  "type": "callClientResult",
  "requestId": "req-01",
  "ok": true,
  "data": {
    "matches": 3
  }
}
```

失败：

```json
{
  "type": "callClientResult",
  "requestId": "req-01",
  "ok": false,
  "error": {
    "code": "handler_error",
    "message": "DOM not ready"
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `type` | `"callClientResult"` | 是 | 消息类型。 |
| `requestId` | `string` | 是 | 与原始 `callClient` 对应。 |
| `ok` | `boolean` | 是 | 表示调用是否成功。 |
| `data` | `unknown` | 否 | `ok: true` 时出现。 |
| `error` | `SerializedError` | 否 | `ok: false` 时出现。 |

### heartbeat

保活消息格式是：

```json
{
  "type": "ping",
  "timestamp": 1760000000000
}
```

以及：

```json
{
  "type": "pong",
  "timestamp": 1760000000000
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `type` | `"ping"` 或 `"pong"` | 是 | 心跳消息类型。 |
| `timestamp` | `number` | 是 | 双方回显的毫秒时间戳。 |

## HTTP loop API

HTTP loop 是 websocket 之外的 request-response 传输方式。

### session 标识

建连后，后续请求需要通过下面任一方式带上 session ID：

- `x-mdp-session-id` header
- `sessionId` query 参数

| 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `x-mdp-session-id` header | `string` | 否 | connect 之后优先使用的 session 标识 header。 |
| `sessionId` query 参数 | `string` | 否 | 同一个 session ID 的 query 参数回退方式。 |

### `POST /mdp/http-loop/connect`

请求体：

```json
{}
```

响应：

```json
{
  "sessionId": "6c8a3b2b-7f2b-4be5-a2d8-1f0c8c4f8b54"
}
```

这里 server 接受一个空 JSON 对象。transport auth 可以通过请求头带入。

| 请求字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| 无 | - | - | 该端点接受空 JSON 对象。 |

| 响应字段 | 类型 | 说明 |
| --- | --- | --- |
| `sessionId` | `string` | 后续 `/send`、`/poll`、`/disconnect` 使用的 HTTP loop 会话 ID。 |

### `POST /mdp/http-loop/send`

请求体：

```json
{
  "message": {
    "type": "registerClient",
    "client": {
      "id": "browser-01",
      "name": "Browser Client",
      "tools": [],
      "prompts": [],
      "skills": [],
      "resources": []
    }
  }
}
```

响应：

```json
{
  "ok": true
}
```

这里仅接受 client-to-server 的 MDP 消息。

| 请求字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `message` | `ClientToServerMessage` | 是 | 一条 client-to-server MDP 消息，不能是 `callClient`。 |

| 响应字段 | 类型 | 说明 |
| --- | --- | --- |
| `ok` | `true` | 表示该消息已被 server 接收并开始处理。 |

### `GET /mdp/http-loop/poll`

query 参数：

- `sessionId`
- 可选 `waitMs`

如果有消息可取，返回：

```json
{
  "message": {
    "type": "callClient",
    "requestId": "req-01",
    "clientId": "browser-01",
    "kind": "tool",
    "name": "searchDom",
    "args": {
      "query": "mdp"
    }
  }
}
```

如果超时前没有消息，server 返回 `204 No Content`。

`waitMs` 最大会被限制到 `60000`。如果不传或传入无效值，server 会使用自己的 long-poll 超时配置。

| Query 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `sessionId` | `string` | 是 | 要轮询的 session。 |
| `waitMs` | `number` | 否 | 希望的 long-poll 等待时间，最大会被限制到 `60000`。 |

| 响应字段 | 类型 | 说明 |
| --- | --- | --- |
| `message` | `ServerToClientMessage` | `200` 时出现，表示取到一条 server 消息。 |

### `POST /mdp/http-loop/disconnect`

请求体：

```json
{}
```

响应：`204 No Content`

| 请求字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| 无 | - | - | 该端点接受空 JSON 对象。session ID 通过 header 或 query 提供。 |

### 完整 HTTP loop 时序

从 client 视角看，正常顺序是：

1. connect 并拿到 `sessionId`
2. 发送 `registerClient`
3. 持续 poll，等待 server 下发 `callClient`
4. 回传 `callClientResult`
5. 用完后 disconnect

最小 `curl` 流程如下：

```bash
curl -X POST http://127.0.0.1:7070/mdp/http-loop/connect \
  -H 'content-type: application/json' \
  -d '{}'
```

示例响应：

```json
{
  "sessionId": "SESSION_ID"
}
```

注册 client：

```bash
curl -X POST 'http://127.0.0.1:7070/mdp/http-loop/send?sessionId=SESSION_ID' \
  -H 'content-type: application/json' \
  -d '{
    "message": {
      "type": "registerClient",
      "client": {
        "id": "browser-01",
        "name": "Browser Client",
        "tools": [{ "name": "searchDom" }],
        "prompts": [],
        "skills": [],
        "resources": []
      }
    }
  }'
```

轮询任务：

```bash
curl 'http://127.0.0.1:7070/mdp/http-loop/poll?sessionId=SESSION_ID&waitMs=25000'
```

如果 server 有任务，就会收到一个 `callClient`。本地 handler 执行完后，回传：

```bash
curl -X POST 'http://127.0.0.1:7070/mdp/http-loop/send?sessionId=SESSION_ID' \
  -H 'content-type: application/json' \
  -d '{
    "message": {
      "type": "callClientResult",
      "requestId": "req-01",
      "ok": true,
      "data": {
        "matches": 3
      }
    }
  }'
```

最后断开：

```bash
curl -X POST 'http://127.0.0.1:7070/mdp/http-loop/disconnect?sessionId=SESSION_ID' \
  -H 'content-type: application/json' \
  -d '{}'
```

## Auth bootstrap API

浏览器 websocket client 可以通过 `/mdp/auth` 先引导 cookie auth。

### `POST /mdp/auth`

请求体：

```json
{
  "auth": {
    "token": "client-session-token"
  }
}
```

响应：

- 状态码 `204 No Content`
- `Set-Cookie` header，内容是序列化后的 auth context

如果请求体里没有 `auth`，server 会回退到从请求头里提取 transport auth。

| 请求字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `auth` | `AuthContext` | 否 | 要序列化进 cookie 的认证上下文。若省略则回退到 transport headers。 |

| 响应元素 | 类型 | 说明 |
| --- | --- | --- |
| `Set-Cookie` | `string` | 后续 websocket 或 HTTP 请求可复用的 auth cookie。 |

浏览器侧的典型引导顺序是：

1. 带着 `auth` body 调用 `POST /mdp/auth`
2. 收到 `Set-Cookie`
3. 在同一 origin 上打开 websocket

之后这个 cookie 就会参与 websocket 会话的 transport auth。

### `DELETE /mdp/auth`

响应：

- 状态码 `204 No Content`
- `Set-Cookie` header，用于清空 auth cookie

| 响应元素 | 类型 | 说明 |
| --- | --- | --- |
| `Set-Cookie` | `string` | 清空当前 auth cookie 的 cookie 指令。 |

## Transport auth 提取规则

默认情况下，server 会从这些位置提取 transport auth：

- `Authorization`
- `Cookie`
- 前缀为 `x-mdp-auth-` 的 headers

对于 websocket 和 HTTP loop，这些 auth 会影响 `connection.authSource`。

## CORS 行为

HTTP loop 和 auth 端点都会带 CORS headers。只要请求里带了 `Origin`，server 就会：

- 回显该 origin
- 允许 credentials
- 允许 `content-type`、`x-mdp-session-id`、配置的 auth headers，以及请求声明的 headers

## 和 MCP bridge 的关系

这些 transport API 是给 MDP client 用的，MCP host 不直接调用它们。MCP host 面向的是 [Tools](/zh-Hans/server/tools) 页面里的 bridge tools。
