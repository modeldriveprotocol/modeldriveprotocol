# Content Script Agents

- Keep command dispatch, DOM actions, waits, recording, selector capture, and main-world bridge code in separate modules.
- Shared mutable page state belongs in `state.ts`, not scattered across helpers.
- Avoid mixing protocol message types with DOM implementation details in one file.
- If a tool family grows near 300 lines, split by action type instead of expanding `index`-style modules.
