---
title: 对外接口
status: Draft
---

# 对外接口

这一组文档面向 MDP client，按“建立链接”“消息事件”“外部接口”三类拆开。

## 按任务阅读

| 目标                                  | 入口                                                                                                                                   |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 建立一个双向会话                      | [WebSocket 建立链接](/zh-Hans/server/api/websocket-connection)                                                                         |
| 用请求响应方式代替 socket             | [HTTP Loop 建立链接](/zh-Hans/server/api/http-loop-connection)                                                                         |
| 浏览器在开 websocket 前先完成鉴权引导 | [鉴权引导](/zh-Hans/server/api/auth-bootstrap)                                                                                         |
| 判断某个端口是不是 MDP 服务           | [GET /mdp/meta](/zh-Hans/server/api/meta)                                                                                              |
| 更新一个已连接 client 的 capability 目录 | [updateClientCapabilities](/zh-Hans/server/api/update-client-capabilities)                                                             |
| 查看 websocket 有哪些消息事件         | [registerClient](/zh-Hans/server/api/register-client)、[callClient](/zh-Hans/server/api/call-client)、[ping](/zh-Hans/server/api/ping) |
| 查看精确的 HTTP 接口契约              | [POST /mdp/http-loop/connect](/zh-Hans/server/api/http-loop-connect)、[POST /mdp/auth](/zh-Hans/server/api/auth-issue)、[GET /mdp/meta](/zh-Hans/server/api/meta) |

## 建立链接

| 方式                                                           | 入口                     | 说明                                         |
| -------------------------------------------------------------- | ------------------------ | -------------------------------------------- |
| [WebSocket 建立链接](/zh-Hans/server/api/websocket-connection) | `ws://127.0.0.1:47372`    | 双向 JSON MDP 消息                           |
| [HTTP Loop 建立链接](/zh-Hans/server/api/http-loop-connection) | `/mdp/http-loop/connect` | 基于 session 的 long-poll transport          |
| [鉴权引导](/zh-Hans/server/api/auth-bootstrap)                 | `/mdp/auth`              | 主要给浏览器 websocket client 做 cookie 引导 |
| [元数据探针](/zh-Hans/server/api/meta)                         | `/mdp/meta`              | 识别一个 MDP server 并读取发现提示           |

## 消息事件

| 事件                                                       | 方向             | 作用                       |
| ---------------------------------------------------------- | ---------------- | -------------------------- |
| [registerClient](/zh-Hans/server/api/register-client)      | Client -> Server | 注册 capability 元数据     |
| [updateClientCapabilities](/zh-Hans/server/api/update-client-capabilities) | Client -> Server | 替换一个或多个 capability 目录 |
| [unregisterClient](/zh-Hans/server/api/unregister-client)  | Client -> Server | 删除一个已注册 client 会话 |
| [callClient](/zh-Hans/server/api/call-client)              | Server -> Client | 路由一个 capability 调用   |
| [callClientResult](/zh-Hans/server/api/call-client-result) | Client -> Server | 回传调用结果               |
| [ping](/zh-Hans/server/api/ping)                           | 双向             | 心跳保活                   |
| [pong](/zh-Hans/server/api/pong)                           | 双向             | 心跳确认                   |

## 外部接口

| 接口                                                                       | 方法     | 作用                           |
| -------------------------------------------------------------------------- | -------- | ------------------------------ |
| [POST /mdp/http-loop/connect](/zh-Hans/server/api/http-loop-connect)       | `POST`   | 创建一个 HTTP loop session     |
| [POST /mdp/http-loop/send](/zh-Hans/server/api/http-loop-send)             | `POST`   | 发送一条 client-to-server 消息 |
| [GET /mdp/http-loop/poll](/zh-Hans/server/api/http-loop-poll)              | `GET`    | 拉取一条 server-to-client 消息 |
| [POST /mdp/http-loop/disconnect](/zh-Hans/server/api/http-loop-disconnect) | `POST`   | 关闭一个 HTTP loop session     |
| [POST /mdp/auth](/zh-Hans/server/api/auth-issue)                           | `POST`   | 签发一个 auth cookie           |
| [DELETE /mdp/auth](/zh-Hans/server/api/auth-delete)                        | `DELETE` | 清除一个 auth cookie           |
| [GET /mdp/meta](/zh-Hans/server/api/meta)                                  | `GET`    | 探测一个 server 的 MDP 元数据  |
| [GET /skills/:clientId/*skillPath](/zh-Hans/server/api/skill-route-direct) | `GET`    | 通过直接路由读取一个 skill     |
| [GET /:clientId/skills/*skillPath](/zh-Hans/server/api/skill-route-nested) | `GET`    | 通过嵌套路由读取一个 skill     |

## 共享 JSON 类型

`AuthContext`：

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

`SerializedError`：

```json
{
  "code": "handler_error",
  "message": "Something failed",
  "details": {
    "reason": "optional"
  }
}
```

`kind` 只会是 `tool`、`prompt`、`skill`、`resource` 之一。

## 与 bridge 工具的关系

这组接口是给 MDP client 用的，MCP host 不直接调用它们。MCP host 面向的是 [工具集](/zh-Hans/server/tools/)。
