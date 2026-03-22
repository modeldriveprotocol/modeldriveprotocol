# Node.js Simple Tools

## `nodejs.getRuntimeInfo`

Call with no arguments.

Returns:

- `nodeVersion`
- `versions`
- `platform`
- `arch`
- `cwd`
- `workspaceRoot`
- `rootPackage`
- `dependencySummary`

## `workspace.listSubpackages`

Call with no arguments.

Returns one entry per discovered workspace package:

- `name`
- `version`
- `private`
- `relativeDir`
- `manifestPath`

## `workspace.readPackageManifest`

Input:

```json
{ "packageDir": "packages/client" }
```

`packageDir` is optional. When omitted, the workspace root package is used.

## `workspace.updatePackageManifest`

Input example:

```json
{
  "packageDir": "packages/client",
  "name": "@modeldriveprotocol/client-next",
  "description": "Updated package description",
  "dependencies": {
    "zod": "^3.25.0"
  },
  "removeDevDependencies": [
    "@types/old-package"
  ]
}
```

Dependency sections are sorted after every update.
