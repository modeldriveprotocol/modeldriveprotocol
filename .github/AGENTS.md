# AGENTS.md

This file is for agents working under `.github/`.

## Purpose

This directory holds GitHub Actions automation for the repository:

- CI and release workflows in `.github/workflows`
- shared step-level automation in `.github/actions`
- GitHub issue forms in `.github/ISSUE_TEMPLATE`

Changes here affect repository verification, packaging, publishing, docs deployment, and GitHub issue intake. Treat workflow or issue-template edits as repository automation changes, not documentation-only cleanup.

For GitHub issue creation rules or issue template conventions, start with [../.ai/rules/github-issues.md](../.ai/rules/github-issues.md).

## Read This Directory In This Order

1. [../AGENTS.md](../AGENTS.md)
2. [workflows/ci.yml](./workflows/ci.yml)
3. [workflows/release.yml](./workflows/release.yml)
4. [workflows/deploy-pages.yml](./workflows/deploy-pages.yml)
5. [workflows/chrome-extension-ci.yml](./workflows/chrome-extension-ci.yml)
6. [workflows/chrome-extension-release.yml](./workflows/chrome-extension-release.yml)
7. [workflows/vscode-extension-ci.yml](./workflows/vscode-extension-ci.yml)
8. [workflows/vscode-extension-release.yml](./workflows/vscode-extension-release.yml)
9. [actions/setup-workspace/action.yml](./actions/setup-workspace/action.yml)
10. [actions/build-workspace-package-deps/action.yml](./actions/build-workspace-package-deps/action.yml)

That order mirrors the intended layering:

- repo-wide verification and release flow first
- app-specific workflows next
- shared action building blocks last

## Module Boundaries

Keep these boundaries intact:

- `.github/workflows/*.yml`
  top-level triggers, permissions, concurrency, job graph, and workflow-specific business logic
- `.github/actions/setup-workspace/action.yml`
  repeated environment setup only
- `.github/actions/build-workspace-package-deps/action.yml`
  repeated shared package build steps only
- `.github/ISSUE_TEMPLATE/*.yml`
  issue intake structure, title guidance, and required submission fields
- `.github/ISSUE_TEMPLATE/config.yml`
  issue template selection behavior such as blank-issue availability

Do not move app-specific release logic into shared actions just because the shell lines look similar.

## Reuse Rules

Prefer the smallest workable abstraction.

- Reuse repeated setup steps with composite actions in `.github/actions`
- Keep workflow-specific version validation, artifact naming, publishing, and release notes in the workflow that owns them
- Do not introduce a reusable workflow for an entire app pipeline unless multiple workflows truly share the same job graph and outputs
- Do not hide trigger conditions, permissions, or release-side effects inside shared actions

For this repo, shared setup like `pnpm` / `node` / dependency install belongs in composite actions. App packaging and publishing decisions stay in the calling workflow.

## Change Strategy

When editing `.github`:

1. keep triggers and `paths` filters aligned with the files that actually affect the workflow
2. preserve least-privilege permissions
3. preserve concurrency behavior unless the change explicitly needs different cancellation semantics
4. prefer additive, testable refactors over broad workflow rewrites
5. if a workflow depends on built workspace package artifacts, make that dependency explicit in steps rather than assuming `dist/**` already exists

## Validation

After changing workflow, action, or issue template files:

```bash
ruby -e 'require "yaml"; YAML.load_file(ARGV[0])' .github/workflows/<file>.yml
ruby -e 'require "yaml"; YAML.load_file(ARGV[0])' .github/actions/<action>/action.yml
ruby -e 'require "yaml"; YAML.load_file(ARGV[0])' .github/ISSUE_TEMPLATE/<file>.yml
```

For behavior validation, run the nearest local commands that the workflow represents, such as:

```bash
pnpm build
pnpm test
pnpm docs:build
pnpm --filter @modeldriveprotocol/chrome-extension build
pnpm --filter @modeldriveprotocol/vscode-extension build
```

Static YAML parsing is necessary but not sufficient. If the workflow logic changes materially, prefer validating the corresponding local command path too.

## Common Mistakes

Avoid these mistakes:

- replacing explicit workflow logic with an over-general reusable workflow
- putting `actions/checkout` inside a local composite action that itself depends on the repo already being checked out
- changing release permissions without checking publish steps
- forgetting to update `paths` filters when shared action files change
- assuming extension builds can consume workspace packages before those packages are built
