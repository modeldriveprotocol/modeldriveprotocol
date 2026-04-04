# AGENTS.md

This file is for agents working on the Chrome extension app under `apps/chrome-extension`.

## Purpose

This app runs an MDP client inside a Chrome Manifest V3 extension and bridges browser-side capabilities with page-side automation.

`AGENTS.md` should stay as a routing index. Do not turn it into the full knowledge base for this app.

## Read Routes

Open the smallest relevant guide for the current task:

- new to this app, need the file reading order, module boundaries, WXT constraints, or change strategy:
  read [agents/architecture.md](./agents/architecture.md)
- about to run checks, package the extension, or decide which validation command proves what:
  read [agents/validation.md](./agents/validation.md)
- need proof in a real browser plus a real MCP/agent CLI flow, or want a reusable end-to-end loop for this app:
  read [agents/real-e2e.md](./agents/real-e2e.md)
- need to launch the extension locally on macOS, inspect extension ids, or debug local Chrome startup:
  read [agents/local-debug.md](./agents/local-debug.md)
- user asks to "look at the effect", "show the UI", "take screenshots", or otherwise verify visual output:
  read [agents/visual-review.md](./agents/visual-review.md)
- user asks to update `AGENTS.md`, add durable guidance, or decide where a lesson should live:
  read [../../agents/progressive-disclosure.md](../../agents/progressive-disclosure.md)
- user asks to improve clarity, simplify usage, reduce cognitive load, or make popup/options easier to understand:
  read [agents/ui-clarity.md](./agents/ui-clarity.md)
- task is about splitting large source files, reorganizing directories, or deciding where extracted modules should live:
  read [agents/source-layout.md](./agents/source-layout.md)
- task is inside `src/ui/**`, or is about where UI files should live after the recent directory flattening:
  read [src/ui/AGENTS.md](./src/ui/AGENTS.md)
- task spans multiple areas:
  read only the matching guides, in the order of immediate need

## Routing Rules

- prefer adding a focused file under `apps/chrome-extension/agents/` over expanding this file
- add one short routing rule here when a new recurring scenario appears
- preserve historical lessons by moving them into the smallest guide that fits the trigger
- if a guide starts covering multiple unrelated triggers, split it
