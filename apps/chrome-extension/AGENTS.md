# AGENTS.md

This file is for agents working on the Chrome extension app under `apps/chrome-extension`.

## Purpose

This app runs an MDP client inside a Chrome Manifest V3 extension and bridges browser-side capabilities with page-side automation.

`AGENTS.md` should stay as a routing index. Do not turn it into the full knowledge base for this app.

## Read Routes

Open the smallest relevant guide for the current task:

- new to this app, need the file reading order, module boundaries, WXT constraints, or change strategy:
  read [.ai/rules/architecture.md](./.ai/rules/architecture.md)
- about to run checks, package the extension, or decide which validation command proves what:
  read [.ai/rules/validation.md](./.ai/rules/validation.md)
- need proof in a real browser plus a real MCP/agent CLI flow, or want a reusable end-to-end loop for this app:
  read [.ai/rules/real-e2e.md](./.ai/rules/real-e2e.md)
- need to launch the extension locally on macOS, inspect extension ids, or debug local Chrome startup:
  read [.ai/rules/local-debug.md](./.ai/rules/local-debug.md)
- user asks to "look at the effect", "show the UI", "take screenshots", or otherwise verify visual output:
  read [.ai/rules/visual-review.md](./.ai/rules/visual-review.md)
- user asks to update `AGENTS.md`, add durable guidance, or decide where a lesson should live:
  read [../../.ai/rules/progressive-disclosure.md](../../.ai/rules/progressive-disclosure.md)
- user asks to improve clarity, simplify usage, reduce cognitive load, or make popup/options easier to understand:
  read [.ai/rules/ui-clarity.md](./.ai/rules/ui-clarity.md)
- task is about the shared asset tree, context menu, path selection, or keeping page/background asset editors behavior aligned:
  read [.ai/rules/asset-workspace.md](./.ai/rules/asset-workspace.md)
- task is about splitting large source files, reorganizing directories, or deciding where extracted modules should live:
  read [../../.ai/rules/architecture/module-organization.md](../../.ai/rules/architecture/module-organization.md), then [.ai/rules/module-organization.md](./.ai/rules/module-organization.md), then [.ai/rules/source-layout.md](./.ai/rules/source-layout.md)
- task is inside `src/ui/**`, or is about where UI files should live after the recent directory flattening:
  read [src/ui/AGENTS.md](./src/ui/AGENTS.md)
- task spans multiple areas:
  read only the matching guides, in the order of immediate need

## Routing Rules

- prefer adding a focused file under `apps/chrome-extension/.ai/rules/` over expanding this file
- add one short routing rule here when a new recurring scenario appears
- preserve historical lessons by moving them into the smallest guide that fits the trigger
- if a guide starts covering multiple unrelated triggers, split it
