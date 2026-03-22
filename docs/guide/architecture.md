---
title: Architecture
status: Draft
---

# Architecture

The end-to-end system has five roles:

1. The user starts using one agent tool by entering a prompt.
2. Each `AgentUI` talks to its own colocated `mdp server`.
3. One `primary mdp server` owns the runtime-local client registry.
4. One or more `secondary mdp servers` stay connected to that primary.
5. `MDP clients` expose concrete runtime-local capabilities and connect only to the primary.

<SharedMermaidDiagram name="architecture/overview" />

## Invocation Path

One routed call across the full stack can go either through a secondary server or directly to the primary:

```mermaid
sequenceDiagram
  participant User
  participant Agent as AgentUI
  participant Secondary as Secondary Server
  participant Primary as Primary Server
  participant Client as MDP Client
  participant Runtime as Local Runtime

  User->>Agent: ask for an action
  opt AgentUI is attached to a secondary server
    Agent->>Secondary: call local mdp server
    Secondary->>Primary: forward federated request
  end
  opt AgentUI is attached directly to the primary server
    Agent->>Primary: call local mdp server
  end
  Primary->>Client: deliver MDP call
  Client->>Runtime: execute runtime-local logic
  Runtime-->>Client: return data
  Client-->>Primary: callClientResult
  opt Result returns through a secondary server
    Primary-->>Secondary: federated result
    Secondary-->>Agent: tool result
  end
  opt Result returns directly to the primary-side AgentUI
    Primary-->>Agent: tool result
  end
  Agent-->>User: answer
```

## Failover Path

If the current primary server becomes unavailable, one secondary server should promote itself to the new primary so the federation can keep routing client calls.

```mermaid
sequenceDiagram
  participant SecondaryA as Secondary Server A
  participant SecondaryB as Secondary Server B
  participant Clients as MDP Clients
  participant Agent as AgentUI

  SecondaryA--xSecondaryB: primary heartbeat stops
  SecondaryB->>SecondaryB: promote to primary
  SecondaryB-->>Clients: advertise new primary route
  Clients->>SecondaryB: reconnect as client-facing sessions
  Agent->>SecondaryB: continue local calls through promoted primary
```

The architectural rule is simple:

- clients normally connect only to the current primary server
- secondaries monitor the primary server
- when the primary disappears, one secondary becomes the new primary
- clients and AgentUI-side traffic should converge on that promoted primary
- the federation should then reform around the new primary

For the concrete startup modes and examples, see [Deployment Modes](/server/deployment). For the server-side runtime model, see [Server Overview](/server/overview).
