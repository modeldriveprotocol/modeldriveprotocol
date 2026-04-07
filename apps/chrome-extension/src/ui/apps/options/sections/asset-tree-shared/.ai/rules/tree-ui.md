# Tree UI

Use this note when editing `components.tsx` or changing how shared tree rows behave visually.

## Scope

This module owns reusable tree presentation pieces:

- folder and file row shells
- rename fields
- shared empty states
- breadcrumb and scope-panel rendering

## Rules

- keep row interactions generic and reusable across page and background editors
- rename field behavior must stay predictable:
  - `Enter` commits
  - `Escape` cancels
  - blur commits only when the value is valid
- shared row components should not mutate selected file or route state by themselves; they should call callbacks and let the parent editor decide
- if page and background visual treatments start drifting, fix the shared component first instead of patching both separately
