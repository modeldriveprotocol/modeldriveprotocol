---
title: 能力模型
status: Draft
---

# 能力模型

`tools` 是显式的函数调用，具有输入和输出。

`prompts` 是由 client 暴露的 prompt 模板或 prompt builder。

`skills` 是具名的技能文档。推荐做法是用 Markdown 编写，并用 `topic`、`topic/detail` 这类路径化名字组织，这样 host 可以先读摘要 skill，再按需继续读取更深节点。

`resources` 是可读取的运行时对象，例如文档、当前选区、状态快照或可安全承载二进制内容的对象。

client 会发布每类能力的元数据，server 负责索引这些元数据，并通过 bridge tools 暴露给 MCP。
