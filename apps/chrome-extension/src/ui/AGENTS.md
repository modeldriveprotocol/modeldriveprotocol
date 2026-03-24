# UI Agents

This file is for agents working inside `apps/chrome-extension/src/ui`.

## Purpose

Keep this directory as the Chrome extension UI root.

Use top-level files in `src/ui/` for stable public modules that entrypoints import, and use focused subdirectories for feature internals.

Do not reintroduce a `src/ui/react/` wrapper layer.

## Read Routes

Open the smallest relevant guide for the current task:

- task is about the options/settings surface:
  read [options/AGENTS.md](./options/AGENTS.md)
- task is about the current-page sidepanel surface:
  read [sidepanel/AGENTS.md](./sidepanel/AGENTS.md)
- task is about UI localization, locale storage, or message dictionaries:
  read [i18n/AGENTS.md](./i18n/AGENTS.md)
- task is about workspace bundle JSON schema structure:
  read [workspace-bundle-schema/AGENTS.md](./workspace-bundle-schema/AGENTS.md)
- task is about app-wide UI theming, chrome runtime messaging from UI, or shared icon helpers:
  start with the top-level modules in this directory:
  [appearance.tsx](./appearance.tsx)
  [theme.ts](./theme.ts)
  [extension-api.ts](./extension-api.ts)
  [client-icons.tsx](./client-icons.tsx)
  [market-catalog.ts](./market-catalog.ts)
  [workspace-bundle.ts](./workspace-bundle.ts)
- task spans multiple UI surfaces:
  read only the matching sub-guides, in the order of immediate need

## Routing Rules

- keep `src/ui/*.ts` and `src/ui/*.tsx` for stable entry modules and cross-surface helpers
- put feature-specific implementation under `src/ui/options/**`, `src/ui/sidepanel/**`, `src/ui/i18n/**`, or `src/ui/workspace-bundle-schema/**`
- if a new UI area becomes large enough to deserve its own sub-guide, add an `AGENTS.md` inside that new folder instead of expanding this file
