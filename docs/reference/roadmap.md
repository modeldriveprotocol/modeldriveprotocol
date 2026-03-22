---
title: Roadmap
status: Draft
---

# Roadmap

This document describes the recommended iteration direction for the repository after the current MVP.

The current baseline is:

- one TypeScript MDP server
- one TypeScript client SDK with browser bundle output
- `ws` / `wss` plus `http` / `https` loop MDP transports
- one fixed MCP bridge surface
- auth envelopes on registration and invocation, transport-carried auth, and server-side authorization hooks
- `GET /mdp/meta` probing plus optional single-upstream proxy mode for layered local deployments
- one smoke test proving the end-to-end path

## Guiding Direction

The next iterations should optimize for three things in this order:

1. protocol stability
2. runtime hardening
3. ecosystem reach

That ordering matters.

Right now the project already proves the shape of MDP. The next work should avoid expanding too many runtimes or transports before the core message model, lifecycle semantics, and routing guarantees are stable enough to hold them.

## Design Constraints

The roadmap assumes these constraints remain true:

- MDP stays language-agnostic and runtime-agnostic
- clients remain the capability providers
- the server remains a bridge and router, not the business-capability source
- MCP exposure remains a fixed bridge surface, not dynamic tool generation per capability
- transport must stay replaceable without rewriting registry and routing logic

## Phase 1: Harden the Protocol

Status: recommended immediate next phase

### Goal

Turn the current message model from a working MVP contract into a versioned protocol surface that other runtimes can implement with low ambiguity.

### Deliverables

- finalize field-level semantics for `registerClient`, `callClient`, `callClientResult`, `ping`, `pong`
- define clear lifecycle rules for reconnect, replacement, unregister, and timeout
- document error taxonomy and expected retry behavior
- decide the stable shape of `args`, `data`, and typed error payloads
- define client identity rules:
  - whether `client.id` is caller-supplied only
  - whether the server may assign or namespace identities
- define capability metadata minimums vs optional fields
- standardize Markdown skill documents and hierarchical naming for progressive disclosure

### Why this comes first

Without this phase, every new runtime binding will encode slightly different assumptions around registration, invocation, and failure handling.

### Acceptance Bar

- an external implementer can build a non-TS client from the protocol docs alone
- message schema docs stop changing structurally from week to week
- reconnect and duplicate-client behavior are explicitly specified, not inferred from code

## Phase 2: Strengthen the Server Runtime

Status: recommended after protocol stabilization starts

### Goal

Make the current server safe enough for repeated local use and easier to extend without refactors.

### Deliverables

- split routing, transport, and registry concerns more explicitly where useful
- add structured logging and observable lifecycle events
- add richer validation at the server boundary
- improve timeout handling and pending request cleanup
- make heartbeat policy configurable per deployment
- add more targeted tests for:
  - duplicate registration
  - disconnect during in-flight request
  - invalid messages
  - multi-client routing
- tighten CLI ergonomics and configuration loading
- harden upstream discovery and proxy failure handling

### Important Non-Goal

Do not add distributed coordination or persistence yet. A simple hub-plus-edge proxy layout is acceptable, but avoid turning the runtime into a peer mesh, a replicated registry, or a multi-writer distributed control plane before the local lifecycle is boring and predictable.

### Acceptance Bar

- server failures are diagnosable from logs
- routing behavior is covered by focused tests, not just the smoke test
- transport replacement would not require changing capability indexing logic
- layered hub and edge deployments remain understandable without introducing a new wire-message family

## Phase 3: Make the Client Model Easier to Embed

Status: parallelizable after Phase 1 starts

### Goal

Reduce friction for embedding MDP into real runtimes, especially browser-hosted and native-hosted environments.

### Deliverables

- finish a true script-tag bootstrap flow around `attr-mdp-*`
- define a more explicit browser bootstrap API
- improve the transport abstraction for non-browser runtimes
- add examples for:
  - plain browser page
  - Node local process
  - native-host bridge shape
- make the client registry model clearer for capability updates after initial registration

### Important Follow-up

This is also the phase where the project should decide whether client capability mutation is:

- re-register the full descriptor
- incremental patch/update messages
- explicit add/remove capability messages

### Acceptance Bar

- a browser integrator can follow docs and connect in minutes
- a non-browser runtime author can identify exactly which interface to implement
- bootstrap behavior is documented and tested, not only implied by examples

## Phase 4: Add Security and Policy

Status: partially started, still incomplete

### Goal

Move from “works locally” toward “safe enough to expose intentionally”.

### Deliverables

- extend the current auth envelopes into a stronger client authentication model
- trust boundary definition between host, server, and clients
- extend and harden the existing authorization policy hooks for capability invocation
- optional allowlists / deny lists by client, capability kind, or capability name
- audit logging for invocations
- clearer security guidance for local vs remote deployment

### Why this is delayed

Security controls depend on stable lifecycle and routing semantics. Adding policy before the invocation model settles usually creates churn.

### Acceptance Bar

- the project can explain who is allowed to connect, who is allowed to call what, and where those decisions live

## Phase 5: Expand Transports

Status: started, but still expandable

### Goal

Support more host environments without coupling the rest of the system to WebSocket assumptions.

### Candidate Transports

- stdio
- TCP
- Unix domain socket
- native bridge adapters
- embedded host callbacks

### Deliverables

- transport interface cleanup where needed
- extend the shipped HTTP loop transport with more deployment-oriented options if needed
- tests proving transport substitution does not change registry and routing semantics

### Acceptance Bar

- one alternate transport ships without requiring changes to protocol models or MCP bridge semantics

## Phase 6: Grow the Ecosystem Surface

Status: later

### Goal

Turn the repository from a single implementation into the reference center for a multi-runtime ecosystem.

### Deliverables

- language bindings or reference adapters for at least one native runtime
- conformance fixtures and test vectors
- richer examples for Android / iOS / Qt / backend embedding
- versioning policy for protocol evolution
- compatibility matrix for server and client versions

### Acceptance Bar

- the project can support multiple independently implemented clients without relying on shared in-repo code

## Recommended Near-Term Sequence

If the repo continues iterating immediately, the best order is:

1. protocol clarification and lifecycle rules
2. server runtime hardening and test expansion
3. browser bootstrap completion
4. one alternate transport
5. auth / policy
6. native runtime reference adapter

This ordering keeps the project from optimizing examples before the protocol contract is tight enough.

## Concrete Next Tickets

The highest-signal next tickets are:

- add protocol version and compatibility rules to the message docs
- specify reconnect / replacement / duplicate-client semantics
- add unit tests around `InvocationRouter` and `CapabilityIndex`
- implement automatic browser bootstrap from `attr-mdp-*`
- define capability update semantics after registration
- introduce structured logging around session lifecycle and invocation outcomes
- document a stable hierarchy-based contract for progressive skill disclosure

## What Should Not Happen Yet

The repo should avoid these too early:

- dynamic MCP tool generation for every client capability
- persistence before lifecycle semantics settle
- distributed registry coordination before single-node behavior is solid
- peer-to-peer server meshes before single-upstream proxy semantics are tightly specified
- many language SDKs before the protocol contract is stable

The MVP is already enough to prove the thesis. The next goal is to make that thesis durable.
