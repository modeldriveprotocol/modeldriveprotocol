# Official Market Sources

This directory defines the fixed catalog path used by repository-backed market sources.

## Fixed Catalog Path

Repository-backed sources always sync from:

`apps/chrome-extension/official-market/catalog.json`

## Supported Providers

- `github`
- `gitlab`

## Repository Source Shape

```json
{
  "kind": "repository",
  "provider": "github",
  "repository": "modeldriveprotocol/modeldriveprotocol",
  "refType": "branch",
  "ref": "main"
}
```

`refType` can be:

- `branch`
- `tag`
- `commit`

## Raw URL Resolution

### GitHub

`https://raw.githubusercontent.com/<owner>/<repo>/<ref>/apps/chrome-extension/official-market/catalog.json`

### GitLab

`https://gitlab.com/<namespace>/<repo>/-/raw/<ref>/apps/chrome-extension/official-market/catalog.json`

## Catalog Format

The catalog file must be JSON with this top-level shape:

```json
{
  "version": "1.0.0",
  "title": "MDP Official Market",
  "clients": []
}
```
