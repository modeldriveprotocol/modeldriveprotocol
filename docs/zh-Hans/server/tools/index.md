---
title: 工具集
status: MVP
---

# 工具集

server 对外暴露的是一组固定的 MCP bridge 工具，不会为每个已注册 capability 动态生成一套工具。

## 按任务阅读

| 目标                                     | 入口                                                                                                                                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 看当前有哪些在线 client                  | [listClients](/zh-Hans/server/tools/list-clients)                                                                                                                                                        |
| 按能力类型查看目录                       | [listTools](/zh-Hans/server/tools/list-tools)、[listPrompts](/zh-Hans/server/tools/list-prompts)、[listSkills](/zh-Hans/server/tools/list-skills)、[listResources](/zh-Hans/server/tools/list-resources) |
| 对一个确定 client 的一个确定能力发起调用 | [callTools](/zh-Hans/server/tools/call-tools)、[getPrompt](/zh-Hans/server/tools/get-prompt)、[callSkills](/zh-Hans/server/tools/call-skills)、[readResource](/zh-Hans/server/tools/read-resource)       |
| 把同一个调用打到多个 client              | [callClients](/zh-Hans/server/tools/call-clients)                                                                                                                                                        |

## 发现类工具

| 工具                                                  | 返回内容                   |
| ----------------------------------------------------- | -------------------------- |
| [listClients](/zh-Hans/server/tools/list-clients)     | 在线 client 摘要与连接信息 |
| [listTools](/zh-Hans/server/tools/list-tools)         | tool 描述列表              |
| [listPrompts](/zh-Hans/server/tools/list-prompts)     | prompt 描述列表            |
| [listSkills](/zh-Hans/server/tools/list-skills)       | skill 描述列表             |
| [listResources](/zh-Hans/server/tools/list-resources) | resource 描述列表          |

## 调用类工具

| 工具                                                | 适用场景                        |
| --------------------------------------------------- | ------------------------------- |
| [callTools](/zh-Hans/server/tools/call-tools)       | 已知 client ID 与 tool 名称     |
| [getPrompt](/zh-Hans/server/tools/get-prompt)       | 已知 client ID 与 prompt 名称   |
| [callSkills](/zh-Hans/server/tools/call-skills)     | 已知 client ID 与 skill 名称    |
| [readResource](/zh-Hans/server/tools/read-resource) | 已知 client ID 与 resource URI  |
| [callClients](/zh-Hans/server/tools/call-clients)   | 需要通用入口或多 client fan-out |

## 共享入参

多数调用类工具都支持可选的 `args` 与 `auth`。

`auth` 会被原样下发到 `callClient.auth`：

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

`args` 是任意 JSON 对象：

```json
{
  "query": "mdp",
  "limit": 10
}
```

## 共享返回形态

多数调用类工具返回如下结构：

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

发现类工具返回的是 `clients`、`tools`、`prompts`、`skills`、`resources` 这类命名数组。

## 直接用 HTTP 读取 skill

skill 文档也可以直接通过 HTTP 读取：

```bash
curl 'http://127.0.0.1:47372/skills/client-01/workspace/review'
curl 'http://127.0.0.1:47372/client-01/skills/workspace/review/files?topic=mdp'
```

这些路由会解析一个精确的 skill 节点，并直接返回 skill 内容，通常是 `text/markdown`。
