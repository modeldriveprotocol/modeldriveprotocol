# Tree Data

Use this note when editing `helpers.tsx` or `types.ts`, or when changing how asset paths become tree nodes.

## Scope

This module owns the data-side behavior for the shared asset tree:

- building folder/file trees from flat asset paths
- filtering tree nodes for search
- collecting folder ids and visible item ids
- computing breadcrumbs and ancestor folders
- rendering matched text fragments

## Rules

- keep path normalization and tree-shape logic here, not in page/background editors
- preserve hidden-dot segments such as `.ai`
- keep `SKILL.md` ordering and path semantics stable unless the product rules explicitly change
- shared helpers should stay asset-type agnostic; do not bake route-only or background-only assumptions into tree data

## Boundary

If a change needs client-specific metadata such as HTTP method badges or background expose ids, compute that outside this module and only pass the normalized tree inputs in.
