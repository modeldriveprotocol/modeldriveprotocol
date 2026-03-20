---
title: Capability Model
status: Draft
---

# Capability Model

`tools` are explicit function calls with input and output.

`prompts` are prompt templates or prompt builders exposed by a client.

`skills` are higher-level workflows, often wrapping multiple internal steps.

`resources` are readable runtime objects such as documents, selections, status snapshots, or binary-safe content.

The client publishes metadata for each capability type. The server indexes that metadata and exposes it through bridge tools.

