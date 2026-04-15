---
title: Polyglot SDK Packages
status: Draft
---

# Polyglot SDK Packages

Use this path when the published SDK packages under `sdks/**` should ship through the shared release workflow.

That currently includes:

- `sdks/go`
- `sdks/python`
- `sdks/rust`
- `sdks/jvm`
- `sdks/dotnet`

## Operator steps

1. Prepare the SDK code changes and bump the versions to the release version.
2. Merge the release commit into `main`.
3. Create and push a tag like `v2.2.0`.
4. GitHub Actions runs `.github/workflows/release.yml`.

## What the workflow does

- validates the release tag against:
  - workspace npm package versions
  - `sdks/python/pyproject.toml`
  - `sdks/rust/Cargo.toml`
  - `sdks/jvm/gradle.properties`
  - `sdks/dotnet/Directory.Build.props`
- tests the Go SDK and creates the prefixed Go module tag for the release commit
- builds and tests the repository npm packages
- builds and tests the Python SDK
- builds and tests the Rust SDK
- builds and tests the JVM SDKs
- builds, tests, and packs the .NET SDK
- publishes each SDK only when its registry credentials are configured
- creates or updates the matching GitHub Release

The Go SDK is source-distributed through the repository itself. On each shared `v*` release, the workflow also creates `sdks/go/v<version>` so `go get github.com/modeldriveprotocol/modeldriveprotocol/sdks/go/v2@v<version>` resolves cleanly.

## Required repository setup

Go:

- no extra registry secret
- workflow must be allowed to push tags with `contents: write`

Python:

- secret `PYPI_API_TOKEN`

Rust:

- secret `CARGO_REGISTRY_TOKEN`

JVM:

- secret `MAVEN_PUBLISH_URL`
- secret `MAVEN_PUBLISH_USERNAME`
- secret `MAVEN_PUBLISH_PASSWORD`
- optional `MAVEN_SIGNING_KEY`
- optional `MAVEN_SIGNING_PASSWORD`

.NET:

- secret `NUGET_API_KEY`

## Local validation before tagging

```bash
(cd sdks/go && go test ./...)
(cd sdks/python && . .venv/bin/activate && pytest -q && python -m build)
cargo test --manifest-path sdks/rust/Cargo.toml
cargo package --manifest-path sdks/rust/Cargo.toml
gradle -p sdks/jvm test
gradle -p sdks/jvm build
dotnet test sdks/dotnet/ModelDriveProtocol.sln
dotnet pack sdks/dotnet/src/ModelDriveProtocol.Client/ModelDriveProtocol.Client.csproj -c Release -o sdks/dotnet/artifacts
```

## Common release failures

- version mismatch:
  the shared tag does not match one of the SDK manifests that declare a version
- Go tag push failure:
  the workflow could not create `sdks/go/v<version>` on the release commit
- skipped publish:
  the workflow did not find the registry secret for that language
- Python upload rejection:
  the package name or version already exists on PyPI
- crates.io upload rejection:
  the crate name/version already exists or packaging metadata is incomplete
- Maven publish failure:
  repository credentials or signing settings are missing or invalid
- NuGet publish failure:
  `NUGET_API_KEY` is missing, invalid, or the package version already exists

## Maintainer notes from the first SDK rollout

- do not reuse an existing shared release tag:
  if `v2.2.0` already exists on GitHub, bump every releasable package and SDK manifest before trying again
- keep one browser tab per registry when using CDP:
  reusing the same PyPI and Sonatype tabs makes it much easier to continue multi-step verification flows
- PyPI setup is stricter than just creating a token:
  verify the primary email first, then enable 2FA, then generate the API token
- PyPI TOTP enrollment is a three-step path:
  generate recovery codes, burn one recovery code to prove you saved them, then add the authenticator app
- Sonatype Central has two separate requirements:
  generate a Portal user token for publishing and verify the namespace itself before the first release
- GitHub-backed Sonatype namespaces are verified through a temporary public repository:
  for `io.github.modeldriveprotocol`, the Portal required a repository named after the verification key under the same GitHub owner
- Maven Central publishing should be treated as signed publishing:
  provide `MAVEN_SIGNING_KEY` and `MAVEN_SIGNING_PASSWORD`, and publish the public key to a supported keyserver before release
- NuGet may block API key creation until the account email is confirmed
- the shared release workflow behaves differently per registry:
  npm publishing is mandatory for the workflow path, while Python, Rust, JVM, and .NET publish steps skip when their secrets are absent
- Go is released from the repository source, not an external registry:
  the release workflow creates `sdks/go/v<version>` on the release commit, so tag push permissions must work
