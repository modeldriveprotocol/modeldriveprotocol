# Node.js Simple Client

This client exposes a small set of Node.js and workspace tools over MDP.

Available tools:

- `nodejs.getRuntimeInfo` returns the current Node.js runtime, workspace root, root manifest metadata, and dependency summaries.
- `workspace.listSubpackages` lists workspace packages discovered from `pnpm-workspace.yaml` or a recursive fallback scan.
- `workspace.readPackageManifest` reads one `package.json` from the current workspace.
- `workspace.updatePackageManifest` updates package metadata and dependency sections in one `package.json`.

Use `nodejs-simple/tools` for exact tool behavior and `nodejs-simple/package-json` for manifest editing workflows.
