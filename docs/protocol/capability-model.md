---
title: Capability Model
status: Draft
---

# Capability Model

`tools` are explicit function calls with input and output.

`prompts` are prompt templates or prompt builders exposed by a client.

`skills` are named skill documents. In the recommended model they are authored as Markdown and organized with path-like names such as `topic` and `topic/detail` so a host can read summary skill content first and then reveal deeper skill nodes only when needed.

`resources` are readable runtime objects such as documents, selections, status snapshots, or binary-safe content.

The client publishes metadata for each capability type. The server indexes that metadata and exposes it through bridge tools.
