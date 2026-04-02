---
title: Skills 定义
status: Draft
---

# Skills 定义

Skill 是分层的技能文档。
在推荐的 MDP 模型里，它们应该用 Markdown 编写，并组织成保留叶子名 `.../skill.md` 的路径，让 host 先读浅层 skill，再按需读取更深 skill。

## 定义一个 skill

使用 `expose()` 加上 `.../skill.md` 路径：

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

当前 skill descriptor 的字段是：

- `path`
- 可选 `description`
- 可选 `contentType`

推荐的 resolver 约定：

- `contentType` 默认会是 `text/markdown`
- `queries` 是 URL query 参数
- `headers` 是 skill 经由 server HTTP 路由读取时收到的请求头
- 返回值本身就是 Markdown 文本

skill path 的格式会被严格限制：

- 用 `/` 分段，例如 `/workspace/review/files/skill.md`
- 只允许小写 `a-z`
- 允许数字 `0-9`
- 允许 `-` 和 `_`
- 不允许空段、尾随 `/`、`.`、`..`、空格、`?`、`#`
- 最后一个 segment 必须是 `skill.md`

SDK 仍然支持 `exposeSkill(name, markdownOrHandler, options?)` 作为兼容语法糖。它会把旧的 skill 名称映射到 canonical compat path，并保留 legacy alias，方便旧 bridge host 继续工作。

## 推荐的渐进式披露模式

直接把层级放进 skill path 本身：

- `/workspace/review/skill.md`
- `/workspace/review/files/skill.md`
- `/workspace/review/files/typescript/skill.md`

推荐的编写规则：

- 根 skill 自身必须有独立价值
- 在 Markdown 正文里直接指向更深 skill path
- 子 skill 要比父 skill 更窄、更具体
- 大块原始数据放 resource，不要把可读指导写成 resource

## 什么时候用 skill

下面这些情况更适合用 skill：

- 你要发布一段可复用的说明或指导
- 你想通过更深 skill 路径完成渐进式披露
- 这些内容本身应该能被模型直接阅读为 Markdown

如果只是一个直接函数调用，优先使用 tool。

## MCP 侧如何暴露

server 会把 skill 元数据索引出来，并通过这些 bridge tools 暴露：

- `listPaths`
- `callPath`
- `callPaths`
- `GET /skills/:clientId/*skillPath`
- `GET /:clientId/skills/*skillPath`

旧的 `listSkills` 和 `callSkills` alias 仍然保留，方便老 host 继续使用。

底层 client 调用仍然会被路由成针对 canonical skill path 的 `GET` `callClient` 消息。
对文档型 skill 来说，HTTP 路由会直接返回 Markdown。

更完整的能力模型可参考 [能力模型](/zh-Hans/protocol/capability-model)。
协议层约定可参考 [渐进式披露](/zh-Hans/protocol/progressive-disclosure)。
