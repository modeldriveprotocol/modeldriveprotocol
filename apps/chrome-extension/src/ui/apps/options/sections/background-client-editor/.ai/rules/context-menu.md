# Background Context Menu

Use this note when editing `context-menu.tsx` or background node right-click behavior.

## Rules

- opening a background context menu is a context action, not a selection change
- opening the menu should clear rename mode first
- root, folder, and file targets should expose only the actions that actually apply to that target
- rename actions should be launched from the menu callback, not as a side effect of opening the menu
- copy-path actions should use display paths that match what the user sees in the tree

## Debug Signal

If right-clicking a node crashes the page and the dev log points at `InputBase` or `FormControl`, check whether menu open is also changing selected item, displayed file, or active rename input.
