# Options Sections Agents

This file routes work inside `src/ui/apps/options/sections`.

## Read Routes

- task is about shared asset tree primitives, tree labels, rename fields, or tree filtering/building:
  read [asset-tree-shared/AGENTS.md](./asset-tree-shared/AGENTS.md)
- task is about the background client asset editor, background asset selection, or background asset context menus:
  read [background-client-editor/AGENTS.md](./background-client-editor/AGENTS.md)
- task is about the page client asset editor, route asset creation, drag/drop, or route asset context menus:
  read [client-assets-panel/AGENTS.md](./client-assets-panel/AGENTS.md)
- otherwise, when touching a section file directly:
  follow the local rules below and open only the matching child guide if the task grows

## Local Rules

- each section file should own one screen or one editor panel
- shared controls belong in `../shared.tsx` or dedicated local helpers, not copied between sections
- if a section needs nested editors, split them into sibling files instead of keeping one large render function
