# AGENTS.md

This file is for AI agents and automated contributors working in this repository.

## Purpose

This repository implements Model Drive Protocol (MDP). Keep this file as a routing index, not the full knowledge base for the repo.

## Read Routes

Open the smallest relevant guide for the current task:

- task is about how `AGENTS.md` files or companion guidance should be organized:
  read [agents/progressive-disclosure.md](./agents/progressive-disclosure.md)
- new to the repo, need the reading order, workspace map, or architecture overview:
  read [agents/architecture.md](./agents/architecture.md)
- deciding which repo-level checks to run or what each validation command proves:
  read [agents/validation.md](./agents/validation.md)
- making cross-package changes, checking architectural assumptions, or avoiding common repo mistakes:
  read [agents/change-strategy.md](./agents/change-strategy.md)
- task is inside a subproject that has its own `AGENTS.md`:
  read that subproject `AGENTS.md` after the relevant repo-level guide
- task spans multiple areas:
  read only the matching guides, in the order of immediate need

## Routing Rules

- prefer adding a focused file under `/agents/` over expanding this file
- add one short routing rule here when a new recurring repository-level scenario appears
- preserve historical lessons by moving them into the smallest guide that fits the trigger
- if a guide starts covering multiple unrelated triggers, split it
