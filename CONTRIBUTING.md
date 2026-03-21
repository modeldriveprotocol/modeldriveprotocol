# Contributing

This guide is the repo-level entrypoint for people contributing to the repository itself.

The detailed contributing docs now live under `docs/contributing/`:

- [Contributing Overview](./docs/contributing/index.md)
- [Project Architecture](./docs/contributing/architecture.md)
- [Environment Overview](./docs/contributing/setup/index.md)
- [Node.js](./docs/contributing/setup/nodejs.md)
- [Protocol Package Guide](./docs/contributing/modules/protocol.md)
- [MDP Server Guide](./docs/contributing/modules/server.md)
- [JavaScript SDK Guide](./docs/contributing/modules/sdks/javascript.md)
- [Chrome Extension Guide](./docs/contributing/modules/apps/chrome-extension.md)
- [VSCode Extension Guide](./docs/contributing/modules/apps/vscode-extension.md)
- [Releasing Overview](./docs/contributing/releasing.md)
- [Release NPM Packages](./docs/contributing/releasing-packages.md)
- [Release Apps](./docs/contributing/releasing-apps.md)
- [中文 / 共建指南](./docs/zh-Hans/contributing/index.md)
- [中文 / 项目架构](./docs/zh-Hans/contributing/architecture.md)
- [中文 / 环境介绍](./docs/zh-Hans/contributing/setup/index.md)
- [中文 / Node.js](./docs/zh-Hans/contributing/setup/nodejs.md)
- [中文 / Protocol 开发指南](./docs/zh-Hans/contributing/modules/protocol.md)
- [中文 / JavaScript SDK 开发指南](./docs/zh-Hans/contributing/modules/sdks/javascript.md)
- [中文 / MDP Server 开发指南](./docs/zh-Hans/contributing/modules/server.md)
- [中文 / Chrome 插件开发指南](./docs/zh-Hans/contributing/modules/apps/chrome-extension.md)
- [中文 / VSCode 插件开发指南](./docs/zh-Hans/contributing/modules/apps/vscode-extension.md)
- [中文 / 发布总览](./docs/zh-Hans/contributing/releasing.md)
- [中文 / NPM 包发布](./docs/zh-Hans/contributing/releasing-packages.md)
- [中文 / 应用发布](./docs/zh-Hans/contributing/releasing-apps.md)

## Local Workflow

Install dependencies and use the repo-level commands from the project root:

```bash
pnpm install
pnpm test:unit
pnpm build
pnpm test
pnpm docs:build
```

These commands match the validation flow described in [AGENTS.md](./AGENTS.md).

## Release Workflow

Package publishing is handled by GitHub Actions plus Changesets.

1. Run `pnpm changeset` for any change that should ship in `@modeldriveprotocol/*`.
2. Commit the generated `.changeset/*.md` file with the code change.
3. Merge the pull request into `main`.
4. On the release commit, run `pnpm version-packages` and commit the version and changelog updates.
5. Create and push a release tag such as `v0.1.1`.
6. The `Release` workflow publishes unpublished package versions from that tagged commit.

Useful commands:

```bash
pnpm changeset
pnpm version-packages
pnpm publish:packages
pnpm release
```

- `pnpm changeset` creates release notes for affected packages.
- `pnpm version-packages` applies pending changesets locally.
- `pnpm publish:packages` publishes versions that are not yet on npm.
- `pnpm release` builds and then publishes, which is useful for dry runs against a private registry.

## Releasing

Release workflow documentation is collected in [docs/contributing/releasing.md](./docs/contributing/releasing.md).

## Maintainer Setup

Before the first publish:

1. Create an npm automation token with publish access to the `@modeldriveprotocol` scope.
2. Add the token to the GitHub repository as `NPM_TOKEN`.
3. Protect `main` so only reviewed, green builds can be merged.

The package manifests are configured for public scoped publishing and npm provenance, so the release workflow publishes public packages and emits provenance attestations.
