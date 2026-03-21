---
title: listClients
status: MVP
---

# `listClients`

`listClients` 用来查看当前 registry 状态，以及有哪些 MDP client 处于在线状态。

## 输入

`listClients` 不接收入参。

```json
{}
```

## 输出

```json
{
  "clients": []
}
```

`clients` 中的每个元素都是一个 `ListedClient`，包含：

- `id`、`name` 与可选描述信息
- `tools`、`prompts`、`skills`、`resources`
- `status`、`connectedAt`、`lastSeenAt`
- `connection.mode`、`connection.secure`、`connection.authSource`

`connection.mode` 只会是 `ws` 或 `http-loop`。

## 适合什么时候用

- 先确认某个运行时是否真的连上了
- 先看一眼能力摘要，再决定往哪个能力类型继续钻
- 排查 transport 模式或 auth 来源

