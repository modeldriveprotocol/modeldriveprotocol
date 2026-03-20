---
title: JetBrains 插件
status: Draft
---

# JetBrains 插件

当 IDE 本地上下文需要留在插件进程内部，但又希望被 MCP host 调用时，JetBrains 插件是 MDP 很合适的一类集成位置。

## 适合暴露的能力

典型场景包括：

- 把基于 PSI 的上下文作为 resource 暴露
- 把编辑器动作暴露成 tool
- 把 inspection 或项目级工作流包装成 skill

## 集成边界

这里最重要的边界和 MDP 其他场景一致：

- 插件负责持有能力
- MDP server 负责注册与路由
- MCP host 只面对 bridge surface

## 当前仓库状态

当前仓库还没有单独提供 JetBrains 插件 package。这个页面更像推荐的集成方向，而不是现成 starter。

如果你现在只是先验证链路，优先看这些页面：

- [JavaScript / 如何使用](/zh-Hans/sdk/javascript/usage)
- [Server / Tools](/zh-Hans/server/tools)
- [Server / protocol](/zh-Hans/server/protocol)
