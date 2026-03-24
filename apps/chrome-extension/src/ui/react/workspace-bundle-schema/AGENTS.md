# Workspace Bundle Schema Agents

- Keep schema constants and definitions split by domain: clients, assets, and sources.
- `index.ts` should only assemble the exported JSON schema object from smaller definition modules.
- New schema sections should go into another focused file instead of growing one large schema definition.
