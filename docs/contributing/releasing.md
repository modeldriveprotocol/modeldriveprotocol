---
title: Releasing Overview
status: Draft
---

# Releasing Overview

This repository has three release tracks:

- npm packages
- polyglot SDK packages
- applications

The npm package track includes the core packages under `packages/*` and any publishable workspace package under `apps/*` that ships through npm, such as `@modeldriveprotocol/browser-simple-mdp-client`.

The polyglot SDK track publishes the runtime client packages under `sdks/**`:

- `sdks/go`
- `sdks/python`
- `sdks/rust`
- `sdks/jvm`
- `sdks/dotnet`

The applications track currently includes:

- Chrome extension zip
- VSCode extension VSIX

The npm package and polyglot SDK tracks currently share the same `v*` tag workflow and version validation, while the application releases keep their own tag patterns.

## Before creating a release tag

1. Make sure the relevant CI is green.
2. Verify the version in the app or package metadata is already updated. The Go SDK follows the shared release tag and does not keep a separate manifest version.
3. Check required secrets or repository variables are configured.
4. Create the tag only from the commit you actually want to publish.

## Release guides

- [Release NPM packages](/contributing/releasing-packages)
- [Polyglot SDK Packages](/contributing/releasing-sdks)
- [Release apps](/contributing/releasing-apps)

## Shared workflow building blocks

Release workflows reuse two narrow composite actions:

- `.github/actions/setup-workspace/action.yml`
  sets up `pnpm`, Node.js, and installs dependencies after checkout
- `.github/actions/build-workspace-package-deps/action.yml`
  builds `@modeldriveprotocol/protocol` and `@modeldriveprotocol/client` before extension bundling

These shared actions only cover repeated setup and shared package build steps. Tag rules, version validation, artifact naming, and publish steps remain in the workflow that owns the release.
