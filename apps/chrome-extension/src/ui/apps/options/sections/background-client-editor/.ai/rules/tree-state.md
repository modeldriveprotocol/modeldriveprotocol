# Background Tree State

Use this note when changing `tree-helpers.ts`, `tree-item.tsx`, or the background editor's selection/expansion wiring.

## Scope

This module owns background-specific tree state:

- display-path stripping and restoration
- initial asset selection from URL path
- rename validation for background expose paths
- collapsed-folder selection fallback

## Rules

- initialize the selected tree item from the current `assetPath` on first render whenever possible
- keep the background tree controlled for its whole lifetime
- do not let selection, expanded folders, and route sync bounce off each other in a loop
- when a folder collapses around the current file, move selection to the nearest valid folder item instead of leaving the tree in an invalid state
- background display-path helpers may hide shared prefixes such as `/extension`, but they must always be reversible back to the real stored path

## Debug Signal

If the options page whitescreens on a background JS leaf and the dev log mentions:

- `changing the uncontrolled selectedItems state ... to be controlled`
- `Maximum update depth exceeded` in `TreeItem`

start with this module before blaming Monaco or the detail editor.
