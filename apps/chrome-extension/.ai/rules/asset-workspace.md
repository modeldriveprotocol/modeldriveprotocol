# Asset Workspace

Use this note when changing the shared asset tree, asset context menus, selected-path routing, or any page/background client asset editing behavior in `options`.

## Goal

Treat page clients and background clients as one asset editing surface with one mental model:

- one shared tree workspace
- one selected file driving the detail pane
- one set of interactions for rename, drag, and context menus
- only code files and `SKILL.md` style markdown files, not separate legacy concepts

## Interaction Rules

- keep page and background asset editors aligned unless there is a real runtime-only constraint
- right-click should open a context menu for the target node without changing the current selection or detail pane
- double-click and explicit menu actions can enter rename mode
- opening a context menu should clear rename mode first so `TextField` focus and menu focus do not fight
- clicking a folder should affect tree navigation only; it should not replace the currently displayed file detail
- default file selection should prefer the nearest valid `SKILL.md`, then fall back to the first asset

## Tree State Rules

- keep `SimpleTreeView` controlled for its whole lifetime
- do not switch `selectedItems` between `undefined` and a real id after first render
- when the route already points at an asset path, initialize the selected tree item from that path on first render
- treat root selection explicitly with a stable null-like value rather than leaving the tree uncontrolled
- avoid effects that bounce selection, expanded folders, and URL state off each other in a loop
- when an effect syncs `expandedFolders` from the displayed asset or selected folder, key it off stable path strings and return the current state when the merged folder set did not actually change
- do not rebuild expansion state with `[...]` or `new Set(...)` on every render unless you also guard the no-op case; otherwise parent rerenders plus URL sync can produce `Maximum update depth exceeded`
- when syncing selected asset from the routed `assetPath`, only apply that correction when the external route actually changed or the current asset disappeared from the model
- never let a route-correction effect keep reapplying a stale `assetPath` after the user already clicked to a different node; that pattern will fight the local `selectedItemId -> displayedAssetId` sync and can crash the page

## Selection Scope Rules

- multi-select, `Ctrl/Cmd+A`, and keyboard navigation must operate on the currently visible tree, not on the fully filtered asset universe
- if a folder is collapsed, hidden descendants must drop out of "select all" and any range-like selection logic
- if a search narrows the tree, selected ids must be normalized back to visible items; do not keep invisible rows highlighted in state
- when collapsing a folder that contains the current file, update both the primary selected item and the selected item set in the same transition; otherwise the detail pane and row highlight diverge
- search-result keyboard navigation must update the selection collection together with the displayed asset, not only the detail pane target

## Context Menu Rules

- context menu state is about the menu target, not the active editor selection
- node-specific actions should be derived from the target kind:
  - root: tree-level actions
  - folder: folder actions and create-in-folder actions
  - file: file actions only
- do not show create-folder or create-file actions on file-target menus unless the action truly applies to the file's parent context

## Crash Patterns To Recognize

If opening an asset page or right-clicking a node whitescreens `options`, check the dev console first.

Common signals from the April 5, 2026 session:

- `MUI X Tree View: changing the uncontrolled selectedItems state ... to be controlled`
  - usually means tree selection is being initialized too late
- `Maximum update depth exceeded` in `TreeItem`
  - usually means tree selection and expansion state are triggering each other
- `Maximum update depth exceeded` in `InputBase` or `FormControl`
  - usually means rename fields or other focused inputs are being mounted repeatedly while menu/selection state also changes
- `Maximum update depth exceeded` in a backend asset page immediately after switching from `SKILL.md` to a JS leaf
  - usually means the backend route-correction effect is still replaying the old `assetPath` while the local click handler is switching the displayed asset

When those appear, inspect:

1. whether right-click mutates selected item or displayed file
2. whether route sync is writing back a different asset path on every render
3. whether rename mode and context menu can be active at the same time for the same node
4. whether backend route correction is keyed to the current route value or just to local asset state changes

## Reuse Rules

- shared asset layout belongs in one workspace component
- shared editor chrome belongs in shared asset editor components
- feature-specific files should only supply asset data, target-specific actions, and runtime-specific detail controls
- if page and background views start diverging visually, first ask whether the logic should be moved back into the shared workspace instead of patched twice
- folder enable-state aggregation, bulk enable/disable mutations, shared tree `sx`, and context-menu target types should live in shared helpers or shared types once both page and background need them
- do not duplicate visible-selection rules in page and background editors; that logic drifts quickly and is hard to review by inspection alone

## Validation Rules

- after refactoring shared asset workspace code, run the full app test suite, not just one or two focused tests
- keep component coverage for both `options` asset editors and any shared tree helpers; shared render-loop bugs often pass typecheck and narrow unit tests
- when the change touches routing, selection, or context menus, prove all three in a real browser:
  1. `SKILL.md` opens
  2. switching to a JS/code leaf works
  3. right-click does not change detail state or crash the page
