---
title: Skills 定义
status: Draft
---

# Skills 定义

Skill 是更偏工作流形态的 capability。适合那些对外应该呈现为“一个命名流程”，但内部可能包含多个步骤的能力。

## 定义一个 skill

使用 `exposeSkill(name, handler, options?)`：

```ts
client.exposeSkill("pageReview", async ({ severity }) => ({
  severity: severity ?? "medium",
  findings: []
}), {
  description: "Run a page review workflow",
  inputSchema: {
    type: "object",
    properties: {
      severity: { type: "string" }
    }
  }
});
```

当前 skill descriptor 的字段是：

- `name`
- 可选 `description`
- 可选 `inputSchema`

## 什么时候用 skill

下面这些情况更适合用 skill：

- 这个能力更像一个 workflow，而不是单次函数调用
- 你希望在发现阶段就表达语义化名称
- 运行时内部会把多个本地步骤合并成一次调用

如果只是一个直接函数调用，优先使用 tool。

## MCP 侧如何暴露

server 会把 skill 元数据索引出来，并通过这些 bridge tools 暴露：

- `listSkills`
- `callSkills`

底层 client 调用仍然会以 `kind: "skill"` 的 `callClient` 消息被路由。

更完整的能力模型可参考 [能力模型](/zh-Hans/protocol/capability-model)。
