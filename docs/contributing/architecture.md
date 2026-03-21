---
title: Project Architecture
status: Draft
---

# Project Architecture

This repository is intentionally split by layer so protocol models, runtimes, apps, docs, and automation can evolve without collapsing into one package.

## Change flow

If a change crosses layers, update them in this order:

1. protocol types
2. runtime implementation
3. tests
4. smoke coverage when needed
5. docs

That order keeps contracts stable first, then moves behavior, then proves the change, then documents it.

## Core architecture

- `packages/protocol`
  owns message schema, guards, errors, and the protocol contract
- `packages/server`
  owns registration lifecycle, routing, transports, and the fixed MCP bridge
- `packages/client`
  owns client SDK behavior, browser entry points, and transport clients
- `apps/*`
  own host-specific integrations such as Chrome and VSCode
- `docs`
  own protocol explanations, examples, guides, and site navigation
- `.github`
  owns CI, release workflows, and reusable GitHub Actions building blocks

## Contribution rules that follow from the architecture

- Start protocol-shape changes in `packages/protocol`.
- Keep server behavior free of browser-specific assumptions.
- Keep client behavior free of server implementation details.
- Treat docs as descriptions of intended behavior, not incidental implementation details.
- Reuse shared CI setup only for repeated steps such as environment preparation and shared package builds.

## Validation path

Use the narrowest validation that proves the change, then expand only when the change crosses layers:

```bash
pnpm test:unit
pnpm build
pnpm test
pnpm docs:build
```
