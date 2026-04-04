# Background Detail Panel

Use this note when editing `detail-panel.tsx`.

## Scope

This module adapts a background expose asset into the shared scripted asset editor.

## Rules

- keep the detail pane thin; it should translate background expose metadata into shared editor props
- background-only controls such as enabled toggles belong here
- code and markdown assets should still flow through the same shared editor shell
- do not reintroduce per-file path editing here; path changes belong in tree rename or tree move interactions
