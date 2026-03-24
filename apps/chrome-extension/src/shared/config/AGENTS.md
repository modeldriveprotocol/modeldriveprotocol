# Config Agents

- Keep this directory pure. Do not add Chrome runtime calls, storage access, or UI helpers here.
- Split by concern: types/defaults, builders/presets, matching, normalization/migration.
- Preserve `/src/shared/config.ts` as a thin re-export entry when import stability matters.
- If normalization or migration logic grows near 300 lines again, split by version or asset family before adding more.
