---
title: 路线图
status: Draft
---

# 路线图

这个文档描述了当前 MVP 之后，仓库推荐的迭代方向。

当前基线是：

- 一个 TypeScript MDP server
- 一个带浏览器 bundle 的 TypeScript client SDK
- 一组 `ws` / `wss` 与 `http` / `https loop` 的 MDP transports
- 一组固定的 MCP bridge surface
- 注册与调用阶段的 auth envelopes，以及 server 侧 authorization hooks
- 一个能验证端到端链路的 smoke test

## 指导方向

接下来的迭代顺序应该按这三个目标依次优化：

1. 协议稳定性
2. 运行时加固
3. 生态覆盖面

这个顺序很重要。

现在这个项目已经证明了 MDP 的基本形状。下一阶段不应该在核心消息模型、生命周期语义、路由保证还不稳定的时候，过早扩很多运行时或 transport。

## 设计约束

这份路线图默认以下约束保持不变：

- MDP 保持语言无关、运行时无关
- client 仍然是 capability provider
- server 仍然是 bridge 和 router，而不是业务能力来源
- MCP 暴露继续保持固定 bridge surface，而不是按 capability 动态生成 tools
- transport 必须可替换，不能要求重写 registry 和 routing 逻辑

## 第一阶段：加固协议

状态：推荐立刻开始

### 目标

把当前“可工作的 MVP 契约”提升为“带版本语义的协议 surface”，让其他运行时可以在低歧义前提下实现它。

### 交付物

- 定义 `registerClient`、`callClient`、`callClientResult`、`ping`、`pong` 的字段级语义
- 明确 reconnect、replacement、unregister 和 timeout 的生命周期规则
- 文档化错误分类和推荐的 retry 行为
- 确定 `args`、`data` 和类型化 error payload 的稳定形状
- 明确 client identity 规则：
  - `client.id` 是否只由调用方提供
  - server 是否允许分配或命名空间化 identity
- 定义 capability metadata 的最小必填字段与可选字段

### 为什么先做这个

如果不先完成这一阶段，每个新运行时绑定都会对注册、调用和失败处理形成各自不同的假设。

### 验收标准

- 外部实现者可以只看协议文档就实现一个非 TS client
- message schema 文档不会每周都发生结构性变化
- reconnect 和 duplicate-client 行为被明确规定，而不是靠读代码猜测

## 第二阶段：强化服务端运行时

状态：建议在协议稳定化启动后推进

### 目标

把当前 server 提升到“足够安全、可重复本地使用、并且更容易扩展”的状态。

### 交付物

- 在合适的地方进一步拆分 routing、transport 和 registry 关注点
- 增加结构化日志和可观测生命周期事件
- 在服务端边界加更严格的验证
- 改进 timeout 处理和 pending request 清理
- 让 heartbeat 策略可配置
- 增加更聚焦的测试：
  - duplicate registration
  - disconnect during in-flight request
  - invalid messages
  - multi-client routing
- 改进 CLI 易用性和配置加载

### 重要非目标

先不要加入分布式协调和持久化。应先把本地单进程行为打磨到足够无聊、足够可预测。

### 验收标准

- server 出错时可以从日志里诊断问题
- routing 行为由聚焦测试覆盖，而不是只靠 smoke test
- 替换 transport 不需要改 capability index 逻辑

## 第三阶段：降低 client 嵌入门槛

状态：第一阶段启动后可并行推进

### 目标

降低 MDP 嵌入真实运行时的成本，尤其是浏览器宿主和原生宿主环境。

### 交付物

- 完成真正的 `attr-mdp-*` script-tag bootstrap 流程
- 定义更明确的浏览器 bootstrap API
- 改进非浏览器运行时的 transport abstraction
- 增加这些示例：
  - 普通浏览器页面
  - Node 本地进程
  - 原生 host bridge 形状
- 让 client registry 对“首次注册后的 capability 更新”更清晰

### 重要后续问题

这一阶段也需要明确 capability mutation 的策略：

- 重新注册完整 descriptor
- 增量 patch / update 消息
- 显式 add / remove capability 消息

### 验收标准

- 浏览器接入方可以按文档在几分钟内连通
- 非浏览器运行时作者可以准确识别自己需要实现的接口
- bootstrap 行为既有文档，也有测试，不再只靠示例暗示

## 第四阶段：加入安全与策略

状态：已经起步，但仍未完成

### 目标

把系统从“本地能跑”提升到“可以被有意识地安全暴露”。

### 交付物

- 把当前 auth envelope 扩展成更完整的 client authentication 模型
- host、server 和 clients 之间的 trust boundary 定义
- 扩展并加固当前已有的 capability invocation authorization policy hooks
- 按 client、capability kind 或 capability name 的 allowlist / denylist
- 调用审计日志
- 面向本地部署和远程部署的安全指导

### 为什么延后

安全控制依赖稳定的生命周期和路由语义。如果调用模型还在变化，就过早叠加策略层，通常只会带来反复返工。

### 验收标准

- 项目可以清楚回答：谁允许连接、谁允许调用什么、这些决策放在哪里

## 第五阶段：扩展 transport

状态：已经开始，但还有扩展空间

### 目标

支持更多宿主环境，同时不让系统其他部分和 WebSocket 假设发生强耦合。

### 候选 transport

- stdio
- TCP
- Unix domain socket
- native bridge adapters
- embedded host callbacks

### 交付物

- 在需要处清理 transport interface
- 在需要时继续扩展当前已交付的 HTTP loop transport
- 用测试证明 transport 替换不会影响 registry 与 routing 语义

### 验收标准

- 增加一个替代 transport 时，不需要修改协议模型或 MCP bridge 语义

## 第六阶段：扩展生态面

状态：更后面

### 目标

把这个仓库从单一实现演进成多运行时生态的参考中心。

### 交付物

- 至少一个原生运行时的语言绑定或 reference adapter
- conformance fixtures 和 test vectors
- 更丰富的 Android / iOS / Qt / 后端嵌入示例
- 协议演进的版本策略
- server / client 版本兼容矩阵

### 验收标准

- 项目可以支持多个彼此独立实现的 clients，而不依赖仓库内共享代码

## 近期推荐顺序

如果仓库立刻继续迭代，最合适的顺序是：

1. 协议澄清和生命周期规则
2. 服务端运行时加固和测试扩展
3. 浏览器 bootstrap 收尾
4. 一个替代 transport
5. auth / policy
6. 原生运行时 reference adapter

这个顺序可以避免在协议契约还不够稳定时，过早优化示例层。

## 具体的下一批任务

当前信号最高的几个 ticket 是：

- 把协议版本和兼容性规则补进 message docs
- 明确定义 reconnect / replacement / duplicate-client 语义
- 为 `InvocationRouter` 和 `CapabilityIndex` 增加单元测试
- 实现 `attr-mdp-*` 的自动浏览器 bootstrap
- 定义注册完成后的 capability update 语义
- 为 session lifecycle 和 invocation outcomes 加结构化日志

## 现在不应该过早做的事

仓库目前应该避免这些方向：

- 为每个 client capability 动态生成 MCP tools
- 在生命周期语义稳定前做持久化
- 在单节点行为还不稳定时做分布式 registry 协调
- 在协议契约还不稳定时同时铺很多语言 SDK

MVP 已经足够证明这件事是成立的。下一步目标是让这件事变得可持续。
