# Options App Agents

- Keep routing helpers, state hooks, shared primitives, and section components in separate files.
- Large feature areas such as clients and market should live under `sections/` and split again when they approach 300 lines.
- New UI behavior should prefer composition over growing `index.tsx`.
