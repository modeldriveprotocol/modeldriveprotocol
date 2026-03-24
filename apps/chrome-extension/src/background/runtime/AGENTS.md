# Runtime Agents

- Keep `index.ts` thin. New behavior should land in focused modules under this directory.
- Keep `/src/background/runtime.ts` as the public entry. Do not reintroduce a one-line passthrough `index.ts`.
- Prefer splitting by responsibility: status/reporting, permissions/scripting, client lifecycle, route sessions, runtime messages.
- Helpers that do not touch runtime state belong in `helpers.ts`.
- If a module grows near 300 lines, split again before adding more logic.
