---
title: Skills 定义
status: Draft
---

# Skills 定义

Skill 是具名的技能文档。
在推荐的 MDP 模型里，它们应该用 Markdown 编写，并通过分层名字组织，让 host 先读浅层 skill，再按需读取更深 skill。

## 定义一个 skill

使用 `exposeSkill(name, resolver, options?)`：

```ts
client.exposeSkill(
  "workspace/review",
  () =>
    "# Workspace Review\n" +
    "\n" +
    "Review the workspace root.\n" +
    "\n" +
    "You can read `workspace/review/files` for file-level guidance."
);

client.exposeSkill(
  "workspace/review/files",
  (query, headers) =>
    "# Workspace Review Files\n" +
    "\n" +
    `Topic: ${query.topic ?? "general"}\n` +
    "\n" +
    `Header: ${headers["x-review-scope"] ?? "none"}`
);
```

当前 skill descriptor 的字段是：

- `name`
- 可选 `description`
- 可选 `contentType`
- 可选 `inputSchema`

推荐的 resolver 约定：

- `contentType` 默认会是 `text/markdown`
- `query` 是 URL query 参数
- `headers` 是 skill 经由 server HTTP 路由读取时收到的请求头
- 返回值本身就是 Markdown 文本

skill path 的格式会被严格限制：

- 用 `/` 分段，例如 `workspace/review/files`
- 只允许小写 `a-z`
- 允许数字 `0-9`
- 允许 `-` 和 `_`
- 不允许空段、前导 `/`、尾随 `/`、`.`、`..`、空格、`?`、`#`

SDK 也支持 `exposeSkill(name, markdown, options?)` 作为静态 skill 的简写。

## 推荐的渐进式披露模式

直接把层级放进 skill 名称本身：

- `workspace/review`
- `workspace/review/files`
- `workspace/review/files/typescript`

推荐的编写规则：

- 根 skill 自身必须有独立价值
- 在 Markdown 正文里直接指向更深 skill 名称
- 子 skill 要比父 skill 更窄、更具体
- 大块原始数据放 resource，不要把可读指导写成 resource

## 旧 handler 形式

SDK 仍然接受旧的 `exposeSkill(name, handler, options?)` 形式以保持兼容。
但新的 skill 文档更推荐使用 resolver 形式。

## 什么时候用 skill

下面这些情况更适合用 skill：

- 你要发布一段可复用的说明或指导
- 你想通过更深 skill 路径完成渐进式披露
- 这些内容本身应该能被模型直接阅读为 Markdown

如果只是一个直接函数调用，优先使用 tool。

## MCP 侧如何暴露

server 会把 skill 元数据索引出来，并通过这些 bridge tools 暴露：

- `listSkills`
- `callSkills`
- `GET /skills/:clientId/*skillPath`
- `GET /:clientId/skills/*skillPath`

底层 client 调用仍然会以 `kind: "skill"` 的 `callClient` 消息被路由。
对文档型 skill 来说，HTTP 路由会直接返回 Markdown。

更完整的能力模型可参考 [能力模型](/zh-Hans/protocol/capability-model)。
协议层约定可参考 [渐进式披露](/zh-Hans/protocol/progressive-disclosure)。
