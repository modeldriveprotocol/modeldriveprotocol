## Official Workspace Bundle

Repository-backed workspace imports resolve a fixed bundle path:

`apps/chrome-extension/official-workspace/workspace.json`

Supported repository providers:

- `github`: `https://raw.githubusercontent.com/<owner>/<repo>/<ref>/apps/chrome-extension/official-workspace/workspace.json`
- `gitlab`: `https://gitlab.com/<namespace>/<repo>/-/raw/<ref>/apps/chrome-extension/official-workspace/workspace.json`

The bundle must be valid JSON and include a semver `version` compatible with the current extension.
