---
title: HTTP Loop 建立链接
status: Draft
---

# HTTP Loop 建立链接

HTTP loop 是 websocket 之外的 request-response 传输方式。

## 端点总览

| 方法   | 路径                                                                    | 作用                               |
| ------ | ----------------------------------------------------------------------- | ---------------------------------- |
| `POST` | [`/mdp/http-loop/connect`](/zh-Hans/server/api/http-loop-connect)       | 创建 loop 会话                     |
| `POST` | [`/mdp/http-loop/send`](/zh-Hans/server/api/http-loop-send)             | 发送一条 client-to-server MDP 消息 |
| `GET`  | [`/mdp/http-loop/poll`](/zh-Hans/server/api/http-loop-poll)             | 拉取一条 server-to-client MDP 消息 |
| `POST` | [`/mdp/http-loop/disconnect`](/zh-Hans/server/api/http-loop-disconnect) | 关闭 loop 会话                     |

## session 标识

`connect` 之后，后续请求需要通过下面任一方式携带 session ID：

- `x-mdp-session-id` header
- `sessionId` query 参数

## connect

请求：

```json
{}
```

响应：

```json
{
  "sessionId": "6c8a3b2b-7f2b-4be5-a2d8-1f0c8c4f8b54"
}
```

## 轮询链路

1. `POST /connect`
2. 通过 `/send` 发送 [registerClient](/zh-Hans/server/api/register-client)
3. 持续 `GET /poll`，直到拿到 [callClient](/zh-Hans/server/api/call-client) 或 `204`
4. 通过 `/send` 回传 [callClientResult](/zh-Hans/server/api/call-client-result)
5. `POST /disconnect`

`/poll` 上的 `waitMs` 最大会被限制到 `60000`。

## 时序图

```mermaid
sequenceDiagram
  participant Client as MDP Client
  participant Server as MDP Server
  participant Host as MCP Host

  Client->>Server: POST /mdp/http-loop/connect
  Server-->>Client: 200 { sessionId }
  Client->>Server: POST /mdp/http-loop/send registerClient

  loop 持续等待被路由的任务
    Client->>Server: GET /mdp/http-loop/poll?waitMs=...
    alt 当前没有待下发消息
      Server-->>Client: 204 No Content
    else 有新的路由调用
      Host->>Server: 发起路由到该 client 的 tool 或 skill 调用
      Server-->>Client: 200 callClient
      Client->>Server: POST /mdp/http-loop/send callClientResult
      Server-->>Host: 返回调用结果
    end
  end

  opt 优雅关闭
    Client->>Server: POST /mdp/http-loop/disconnect
    Server-->>Client: 204 No Content
  end
```

如果你要看每个端点的精确请求和响应格式，继续阅读：

- [POST /mdp/http-loop/connect](/zh-Hans/server/api/http-loop-connect)
- [POST /mdp/http-loop/send](/zh-Hans/server/api/http-loop-send)
- [GET /mdp/http-loop/poll](/zh-Hans/server/api/http-loop-poll)
- [POST /mdp/http-loop/disconnect](/zh-Hans/server/api/http-loop-disconnect)

## 适合什么时候用

- 运行时无法保持 websocket
- 运行环境只支持普通 HTTP 请求响应
