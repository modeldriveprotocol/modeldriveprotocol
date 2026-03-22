---
title: 架构
status: Draft
---

# 架构

完整链路里一共有五层角色：

1. 用户开始使用 Agent 工具输入特定提示词。
2. 每个 `AgentUI` 都连接自己对应的本地 `mdp server`。
3. 一个 `主 mdp server` 持有运行时本地 client registry。
4. 一个或多个 `从 mdp server` 与这个主 server 保持连接。
5. `MDP clients` 从具体运行时暴露本地能力，并且只连接主 server。

```mermaid
flowchart LR
  user["用户"]

  subgraph agents["Agent UI"]
    claude["Claude Code"]
    codex["Codex"]
    cursor["Cursor"]
  end

  subgraph servers["MDP Server Federation"]
    primary["主 MDP Server"]
    secondaryB["从 MDP Server B"]
    secondaryC["从 MDP Server C"]
  end

  clients["MDP Clients"]
  tools["Tools"]
  skills["Skills"]
  prompts["Prompts"]
  resources["Resources"]

  user --> claude
  user --> codex
  user --> cursor

  claude <-->|"本地主机链路"| secondaryB
  codex <-->|"本地主机链路"| primary
  cursor <-->|"本地主机链路"| secondaryC

  primary <-->|"主从联邦"| secondaryB
  primary <-->|"主从联邦"| secondaryC
  secondaryB <-->|"主从联邦"| secondaryC

  primary <-->|"client 会话"| clients
  clients --> tools
  clients --> skills
  clients --> prompts
  clients --> resources
```

## 调用路径

一条完整调用穿过整条链路时，可以选择直接进入主 server，也可以在存在从 server 时先经过从 server：

```mermaid
sequenceDiagram
  participant User as 用户
  participant Agent as AgentUI
  participant Secondary as 从 Server
  participant Primary as 主 Server
  participant Client as MDP Client
  participant Runtime as 本地运行时

  User->>Agent: 提出一个任务
  opt AgentUI 挂在从 Server 上
    Agent->>Secondary: 调用本地 mdp server
    Secondary->>Primary: 发起主从转发请求
  end
  opt AgentUI 直接挂在主 Server 上
    Agent->>Primary: 调用本地 mdp server
  end
  Primary->>Client: 下发 MDP 调用
  Client->>Runtime: 执行运行时本地逻辑
  Runtime-->>Client: 返回数据
  Client-->>Primary: callClientResult
  opt 结果通过从 Server 回传
    Primary-->>Secondary: 回传转发结果
    Secondary-->>Agent: tool result
  end
  opt 结果直接回到主 Server 一侧的 AgentUI
    Primary-->>Agent: tool result
  end
  Agent-->>User: 返回回答
```

## 故障切换路径

如果当前主 server 不可用，则应由某个从 server 自动提升为新的主 server，这样整条联邦链路还能继续路由 client 调用。

```mermaid
sequenceDiagram
  participant SecondaryA as 从 Server A
  participant SecondaryB as 从 Server B
  participant Clients as MDP Clients
  participant Agent as AgentUI

  SecondaryA--xSecondaryB: 主心跳停止
  SecondaryB->>SecondaryB: 提升为主 Server
  SecondaryB-->>Clients: 广播新的主路由
  Clients->>SecondaryB: 重新建立 client-facing 会话
  Agent->>SecondaryB: 持续通过新主 Server 发起本地调用
```

这个架构约束很简单：

- client 在正常情况下只连接当前主 server
- 从 server 持续监测主 server
- 当主 server 消失时，由某个从 server 升级为新的主 server
- client 和 AgentUI 一侧的流量都应重新收敛到这个新主 server
- 然后再以这个新主 server 为中心重建联邦关系

关于具体的启动模式和示例，继续阅读 [部署模式](/zh-Hans/server/deployment)。关于 server 侧运行时模型，继续阅读 [Server Overview](/zh-Hans/server/overview)。
