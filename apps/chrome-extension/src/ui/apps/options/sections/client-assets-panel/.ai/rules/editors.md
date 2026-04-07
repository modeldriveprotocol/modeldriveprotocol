# Route Asset Editors

Use this note when editing `editors.tsx`.

## Scope

This module adapts route assets into the shared scripted asset editor shell.

## Rules

- keep code and markdown editors thin adapters over the shared editor panel
- method selection belongs on code assets only
- route-specific metadata updates should happen here, but the shared editor chrome should stay shared
- do not add custom page-only borders, headings, or layout shells here when the same treatment should apply to background assets
