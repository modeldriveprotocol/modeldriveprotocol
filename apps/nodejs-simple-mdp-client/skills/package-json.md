# Package JSON Workflows

Use `workspace.readPackageManifest` before making edits when you need to inspect current values.

Use `workspace.updatePackageManifest` for:

- renaming a package with `name`
- updating package text with `description`
- adding or updating entries in `dependencies`, `devDependencies`, `peerDependencies`, or `optionalDependencies`
- removing entries with `removeDependencies`, `removeDevDependencies`, `removePeerDependencies`, or `removeOptionalDependencies`

The tool writes the manifest back to disk with two-space indentation and a trailing newline, while preserving unrelated fields.

Recommended sequence:

1. Call `workspace.listSubpackages` if you are not sure which package directory to target.
2. Call `workspace.readPackageManifest` for the selected package.
3. Call `workspace.updatePackageManifest` with the smallest possible change set.
