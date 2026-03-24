# Workspace Bundle Schema Agents

- Keep schema constants and definitions split by domain: clients, assets, and sources.
- Keep `/src/ui/workspace-bundle-schema.ts` as the schema entry and assemble it from smaller definition modules.
- New schema sections should go into another focused file instead of growing one large schema definition.
