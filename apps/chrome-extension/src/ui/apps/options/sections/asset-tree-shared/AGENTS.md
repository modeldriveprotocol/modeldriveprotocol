# Asset Tree Shared Agents

This directory holds the shared asset-tree primitives used by both page and background asset editors.

## Read Routes

- task is about tree construction, folder flattening, path labels, search filtering, or highlight rendering:
  read [.ai/rules/tree-data.md](./.ai/rules/tree-data.md)
- task is about tree row UI, rename fields, folder/file labels, or shared empty/scope panels:
  read [.ai/rules/tree-ui.md](./.ai/rules/tree-ui.md)

## Routing Rules

- keep this directory focused on reusable asset-tree behavior
- do not move client-specific menu actions or runtime-specific editor logic here
- if a change only matters to one editor, keep it in that editor module instead of broadening the shared tree
