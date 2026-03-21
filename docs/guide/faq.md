---
title: FAQ
status: Draft
---

# FAQ

## Is MDP only for JavaScript?

No. JavaScript is just one adapter path. The protocol is language-neutral and should work for Android, iOS, Qt, backend runtimes, and web clients.

## Why not generate one MCP tool per client capability?

Because the set is dynamic. A stable bridge surface is easier to reason about, easier to keep compatible, and better suited to runtime-local procedures.
