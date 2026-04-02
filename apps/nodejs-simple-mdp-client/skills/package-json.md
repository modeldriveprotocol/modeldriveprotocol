# Package JSON Workflows

Use `POST /workspace/package-manifest` before making edits when you need to inspect current values.

Use `POST /workspace/update-package-manifest` for:

- renaming a package with `name`
- updating package text with `description`
- adding or updating entries in `dependencies`, `devDependencies`, `peerDependencies`, or `optionalDependencies`
- removing entries with `removeDependencies`, `removeDevDependencies`, `removePeerDependencies`, or `removeOptionalDependencies`

The tool writes the manifest back to disk with two-space indentation and a trailing newline, while preserving unrelated fields.

Recommended sequence:

1. Call `GET /workspace/subpackages` if you are not sure which package directory to target.
2. Call `POST /workspace/package-manifest` for the selected package.
3. Call `POST /workspace/update-package-manifest` with the smallest possible change set.
