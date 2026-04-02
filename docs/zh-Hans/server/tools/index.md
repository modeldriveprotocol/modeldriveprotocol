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
| 查看 canonical 路径目录                 | [listPaths](/zh-Hans/server/tools/list-paths)                                                                                                                                                            |
| 对一个确定 client 的一个确定路径发起调用 | [callPath](/zh-Hans/server/tools/call-path)                                                                                                                                                              |
| 把同一路径调用打到多个 client            | [callPaths](/zh-Hans/server/tools/call-paths)                                                                                                                                                            |

## 发现类工具

| 工具                                              | 返回内容                       | 备注                                                         |
| ------------------------------------------------- | ------------------------------ | ------------------------------------------------------------ |
| [listClients](/zh-Hans/server/tools/list-clients) | 在线 client 摘要与连接信息     | 支持大小写不敏感的 `search`，会匹配 client 字段和目录内容    |
| [listPaths](/zh-Hans/server/tools/list-paths)     | canonical 路径 descriptor 列表 | 支持 `clientId`、`search`、`depth`；默认只返回一层目录       |

## 调用类工具

| 工具                                                | 适用场景                        |
| --------------------------------------------------- | ------------------------------- |
| [callPath](/zh-Hans/server/tools/call-path)         | 已知 client ID 与精确的 `method + path` |
| [callPaths](/zh-Hans/server/tools/call-paths)       | 需要按 `method + path` 做 canonical fan-out |

这四个 tools 就是当前完整的 canonical bridge surface。

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

legacy 调用别名仍然接受 `args` 与可选的 `auth`。

## 直接用 HTTP 读取 skill

skill 文档也可以直接通过 HTTP 读取：

```bash
curl 'http://127.0.0.1:47372/skills/client-01/workspace/review'
curl 'http://127.0.0.1:47372/client-01/skills/workspace/review/files?topic=mdp'
```

这些路由会解析一个精确的 skill 节点，并直接返回 skill 内容，通常是 `text/markdown`。
