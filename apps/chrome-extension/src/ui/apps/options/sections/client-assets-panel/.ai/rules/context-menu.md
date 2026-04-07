# Route Context Menu

Use this note when editing `context-menu.tsx`.

## Rules

- context menus should vary by target:
  - root: tree-level and create actions
  - folder: create-in-folder plus folder actions
  - file: file actions only
- opening the menu should not also change the selected file
- clear rename mode before opening the menu
- if an action applies to the parent folder rather than the file, do not show it on the file menu
- root `SKILL.md` must stay protected from destructive actions
