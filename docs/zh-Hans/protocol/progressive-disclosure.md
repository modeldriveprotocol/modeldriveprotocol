---
title: 渐进式披露
status: Draft
---

# 渐进式披露

MDP 中的渐进式披露，应该建模成一棵 skill path 树，而不是一个带状态的 skill 会话。

设计目标很直接：

- client 先发布一个短小的根 skill
- host 只有在需要时才继续读取更深 skill 路径
- 避免把整套说明一次性塞进一个 capability 定义里

## 定义模型

推荐的 JS SDK 写法是：

```ts
client.expose(
  '/workspace/review/skill.md',
  '# Workspace Review\n' +
    '\n' +
    'Review the workspace root.\n' +
    '\n' +
    'You can read `/workspace/review/files/skill.md` for file-level guidance.'
)

client.expose(
  '/workspace/review/files/skill.md',
  {
    description: 'File-level review guidance'
  },
  ({ queries, headers }) =>
    '# Workspace Review Files\n' +
    '\n' +
    `Topic: ${queries.topic ?? 'general'}\n` +
    '\n' +
    `Header: ${headers['x-review-scope'] ?? 'none'}`
)
```

渐进式披露的单位，就是 skill path 本身：

- `/workspace/review/skill.md` 是摘要节点
- `/workspace/review/files/skill.md` 是更深一层
- `/workspace/review/files/typescript/skill.md` 还可以继续下钻

## 发现与读取

server 仍然只需要现有 bridge surface：

- `listPaths` 用来发现 skill path
- `callPath` 用来读取某个精确 skill 节点
- `callPaths` 用来把一次 skill 读取 fan-out 到多个 client
- `GET /skills/:clientId/*skillPath` 用来经由 HTTP 读取某个精确 skill 节点
- `GET /:clientId/skills/*skillPath` 是另一种等价的 HTTP 形态

HTTP 路由会把 URL query 参数和请求头传给 skill resolver。

## Server 行为

server 端保持刻意简单：

- 索引 skill path 和描述
- 原样把 `callPath` 转发给目标 client
- 不需要理解 skill 层级，层级含义完全由路径表达

旧的 `listSkills` 和 `callSkills` alias 仍然可以保留在这层 path model 之上，用来做兼容。

这样渐进式披露就变成一种命名与编写约定，而不是协议状态机。

## 设计约束

- 根 skill 本身必须有独立价值。
- 用路径化名字表达深度。
- 父 skill 直接在 Markdown 里指向子 skill。
- 每个 skill 都要足够聚焦，方便 host 决定要不要继续读。
- 大块原始数据放 resource，skill 更适合承载可阅读的说明与指导。
