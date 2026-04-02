# Node.js Simple Client

This client exposes a small set of Node.js and workspace endpoints over MDP.

Available endpoints:

- `GET /nodejs/runtime-info` returns the current Node.js runtime, workspace root, root manifest metadata, and dependency summaries.
- `GET /workspace/subpackages` lists workspace packages discovered from `pnpm-workspace.yaml` or a recursive fallback scan.
- `POST /workspace/package-manifest` reads one `package.json` from the current workspace.
- `POST /workspace/update-package-manifest` updates package metadata and dependency sections in one `package.json`.

Use `/nodejs-simple/tools/skill.md` for exact endpoint behavior and `/nodejs-simple/package-json/skill.md` for manifest editing workflows.
