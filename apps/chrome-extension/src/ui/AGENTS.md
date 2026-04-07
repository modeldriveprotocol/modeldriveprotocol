# UI Agents

This file is for agents working inside `apps/chrome-extension/src/ui`.

## Purpose

Keep this directory as the Chrome extension UI root and routing index.

Use subdirectories as the primary organizational unit. Do not grow this directory back into a flat set of unrelated files.

Do not reintroduce a `src/ui/react/` wrapper layer.

## Read Routes

Open the smallest relevant guide for the current task:

- task is about splitting UI modules, reducing file size, or deciding what should stay local versus shared:
  read [../../.ai/rules/module-organization.md](../../.ai/rules/module-organization.md)
- task is about the extension app surfaces under `options` or `sidepanel`:
  read [apps/AGENTS.md](./apps/AGENTS.md)
- task is about UI localization, locale storage, or message dictionaries:
  read [i18n/AGENTS.md](./i18n/AGENTS.md)
- task is about workspace bundle JSON schema structure:
  read [workspace-bundle/AGENTS.md](./workspace-bundle/AGENTS.md)
- task is about app-wide UI theming, chrome runtime messaging from UI, or shared icon helpers:
  read the focused shared guides in this order:
  [foundation/AGENTS.md](./foundation/AGENTS.md)
  [platform/AGENTS.md](./platform/AGENTS.md)
  [market/AGENTS.md](./market/AGENTS.md)
- task spans multiple UI surfaces:
  read only the matching sub-guides, in the order of immediate need

## Routing Rules

- keep `src/ui/` itself nearly empty and organized by feature directory
- put feature-specific implementation under `src/ui/apps/options/**`, `src/ui/apps/sidepanel/**`, `src/ui/i18n/**`, `src/ui/foundation/**`, `src/ui/platform/**`, `src/ui/market/**`, or `src/ui/workspace-bundle/**`
- if a new UI area becomes large enough to deserve its own sub-guide, add an `AGENTS.md` inside that new folder instead of expanding this file
