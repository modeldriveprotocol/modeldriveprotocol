# Change Strategy

Use this note when making cross-package changes, checking repo-level architectural assumptions, or avoiding common repository mistakes.

## Safe Change Strategy

When changing code, keep these rules in mind:

- protocol changes should start in `packages/protocol`
- server changes should not encode browser-specific assumptions
- client changes should not encode server implementation details
- docs should describe protocol behavior, not accidental implementation quirks

If a change touches multiple layers, update them in this order:

1. protocol types
2. server runtime
3. client runtime
4. package unit tests
5. smoke test
6. docs

## Current Architectural Assumptions

As of the current MVP:

- MDP-side transports are `ws` / `wss` and `http` / `https` loop
- registry is in-memory only
- cluster leadership is coordinated with term / lease / election over the server control websocket
- leader isolation must not preserve write leadership indefinitely; the leader should step down when it loses quorum
- cluster membership is in-memory and sticky by default, but may also be pinned by explicit static member ids; quorum does not shrink automatically during transient discovery loss
- cluster identity must be treated separately from membership; peers from a different `cluster.id` must not be admitted even if server ids overlap
- `serverId` uniqueness matters within one cluster; duplicate ids on different endpoints should be rejected, not silently deduplicated
- `/mdp/meta` exposes node-local quorum diagnostics such as known members, reachable members, and quorum state; keep those semantics aligned with `cluster-manager.ts`
- MCP-side surface is fixed bridge tools
- clients are the capability source
- the server is a registry and invocation router, not the capability owner
- client sessions are not replicated across servers; after primary failover, clients must reconnect
- registration and invocation messages may carry auth envelopes
- transport requests may also carry auth headers for server-side policy
- browser `ws` / `wss` clients may bootstrap transport auth through `/mdp/auth` cookie issuance

If you change any of those assumptions, update:

- [README.md](../../README.md)
- [docs/protocol/overview.md](../../docs/protocol/overview.md)
- [docs/protocol/message-schema.md](../../docs/protocol/message-schema.md)
- [docs/reference/roadmap.md](../../docs/reference/roadmap.md)

## Places Where Agents Commonly Waste Time

Avoid these mistakes:

- reading `dist/**` before `src/**`
- changing docs without checking whether `prepare-docs.mjs` copies generated assets
- adding runtime-specific assumptions into the protocol package
- adding dynamic MCP tool generation when the repo is intentionally using a fixed bridge surface
- skipping unit tests and relying only on the smoke test
- expanding transports before understanding `ClientSession`, `CapabilityIndex`, `InvocationRouter`, and `MdpTransportServer`

## Recommended Next Work

If no specific feature is requested, the best next areas to inspect are:

- protocol lifecycle semantics
- server hardening and test coverage
- browser bootstrap flow
- alternate transport support
- auth and policy hooks
