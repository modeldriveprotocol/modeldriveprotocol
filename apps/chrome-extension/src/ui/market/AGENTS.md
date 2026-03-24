# Market Agents

- Keep market source fetch, validation, compatibility checks, and installed-client bookkeeping in this directory.
- Do not mix market UI rendering into these modules; UI belongs under `options/sections/**`.
- Repository-source URL normalization and zod parsing should stay here so callers only deal with typed results.
