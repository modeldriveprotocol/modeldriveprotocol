# AGENTS.md

This file is for AI agents and automated contributors working in this repository.

## Purpose

This repository implements Model Drive Protocol (MDP). Keep this file as a routing index, not the full knowledge base for the repo.

## Read Routes

Open the smallest relevant guide for the current task:

- task is about how `AGENTS.md` files or companion guidance should be organized:
  read [.ai/rules/progressive-disclosure.md](./.ai/rules/progressive-disclosure.md)
- new to the repo, need the reading order, workspace map, or architecture overview:
  read [.ai/rules/architecture.md](./.ai/rules/architecture.md)
- task is about splitting large source files, keeping file size bounded, or deciding where extracted modules should live:
  read [.ai/rules/architecture/module-organization.md](./.ai/rules/architecture/module-organization.md)
- deciding which repo-level checks to run or what each validation command proves:
  read [.ai/rules/validation.md](./.ai/rules/validation.md)
- task requires proof from a real hosted runtime, not just unit tests or repo smoke checks:
  read [.ai/rules/validation.md](./.ai/rules/validation.md), then the relevant subproject validation and host-specific E2E guide
- task is about Codex CLI usage, project-level MCP config, or debugging why Codex cannot use the local `mdp` MCP server:
  read [.ai/rules/codex-cli.md](./.ai/rules/codex-cli.md)
- task is about creating GitHub issues, editing issue templates, or following repo issue title conventions:
  read [.ai/rules/github-issues.md](./.ai/rules/github-issues.md)
- making cross-package changes, checking architectural assumptions, or avoiding common repo mistakes:
  read [.ai/rules/change-strategy.md](./.ai/rules/change-strategy.md)
- task is inside a subproject that has its own `AGENTS.md`:
  read that subproject `AGENTS.md` after the relevant repo-level guide
- task spans multiple areas:
  read only the matching guides, in the order of immediate need

## Routing Rules

- prefer adding a focused file under `/.ai/rules/` over expanding this file
- add one short routing rule here when a new recurring repository-level scenario appears
- preserve historical lessons by moving them into the smallest guide that fits the trigger
- if a guide starts covering multiple unrelated triggers, split it
