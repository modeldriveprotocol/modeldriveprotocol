---
title: Releasing Overview
status: Draft
---

# Releasing Overview

This repository has two release tracks:

- npm packages
- applications

The applications track currently includes:

- Chrome extension zip
- VSCode extension VSIX

Each path is triggered by a different tag pattern and has its own validation rules.

## Before creating a release tag

1. Make sure the relevant CI is green.
2. Verify the version in the app or package metadata is already updated.
3. Check required secrets or repository variables are configured.
4. Create the tag only from the commit you actually want to publish.

## Release guides

- [Release NPM packages](/contributing/releasing-packages)
- [Release apps](/contributing/releasing-apps)

## Shared workflow building blocks

Release workflows reuse two narrow composite actions:

- `.github/actions/setup-workspace/action.yml`
  sets up `pnpm`, Node.js, and installs dependencies after checkout
- `.github/actions/build-workspace-package-deps/action.yml`
  builds `@modeldriveprotocol/protocol` and `@modeldriveprotocol/client` before extension bundling

These shared actions only cover repeated setup and shared package build steps. Tag rules, version validation, artifact naming, and publish steps remain in the workflow that owns the release.
