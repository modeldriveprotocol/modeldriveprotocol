# Options App Agents

- Keep routing helpers, state hooks, shared primitives, and section components in separate files.
- Large feature areas such as clients and market should live under `sections/` and split again when they approach 300 lines.
- Keep `/src/ui/apps/options/app.tsx` as the options entry and let it stay focused on controller + shell wiring.
- New UI behavior should prefer composition over growing the root app file.
