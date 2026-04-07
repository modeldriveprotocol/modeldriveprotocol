# Route Tree Interactions

Use this note when editing `tree.tsx` or the route asset tree wiring in `client-assets-panel.tsx`.

## Rules

- dragging and dropping should change path structure without changing the shared editing model
- double-click should enter rename mode when the target is allowed to be renamed
- folder clicks are navigation events; they should not replace the currently displayed file detail
- keep tree selection controlled for the whole component lifetime
- when a route file becomes invalid or disappears, fall back to the nearest valid `SKILL.md` before falling back to another asset

## Shared Constraint

If route tree behavior differs from background tree behavior and there is no runtime reason, assume the divergence is a bug and push the shared behavior down into the common workspace or tree primitives.
