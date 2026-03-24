# Route Capability Agents

- Keep `index.ts` focused on capability assembly and registration.
- Split tool families into focused files: interaction, injected bridge tools, waits, and shared helpers.
- Do not move background runtime orchestration into this directory; keep it limited to route-scoped capability exposure.
- If a tool file approaches 300 lines, split by workflow rather than adding another broad helper bag.
