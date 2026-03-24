# Popup App Agents

- Keep `index.tsx` limited to wiring controller state into `PopupView` and `SidepanelView`.
- Put async state, subscriptions, and derived selection logic in hooks, not in render files.
- Split popup and sidepanel UI into focused panels instead of growing one render file.
- Shared button primitives such as icon-only actions belong in dedicated small components.
