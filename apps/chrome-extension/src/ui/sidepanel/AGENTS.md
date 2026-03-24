# Sidepanel Agents

- This directory is sidepanel-only. Do not add a `popup` surface switch back into it.
- Keep `/src/ui/sidepanel-app.tsx` limited to wiring controller state into `SidepanelView`.
- Put async state, subscriptions, and derived selection logic in hooks, not in render files.
- Split sidepanel UI into focused panels instead of growing one render file.
- Shared button primitives such as icon-only actions belong in dedicated small components.
