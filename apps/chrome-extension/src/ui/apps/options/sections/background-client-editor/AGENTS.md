# Background Client Editor Agents

This directory holds the background-client asset editor helpers under `options`.

## Read Routes

- task is about background tree selection, display-path mapping, rename validation, or expanded-folder behavior:
  read [.ai/rules/tree-state.md](./.ai/rules/tree-state.md)
- task is about background context menus or node-level interaction semantics:
  read [.ai/rules/context-menu.md](./.ai/rules/context-menu.md)
- task is about the right-side background asset detail pane:
  read [.ai/rules/detail-panel.md](./.ai/rules/detail-panel.md)

## Routing Rules

- keep background-specific behavior here, but prefer the shared asset workspace whenever page and background should match
- background assets are still driven by expose definitions and display-path mapping, so do not copy route-asset assumptions in here
