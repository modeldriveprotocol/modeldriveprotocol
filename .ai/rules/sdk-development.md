# SDK Development

Use this note when implementing, reviewing, or releasing client SDKs under `sdks/**`, or when keeping behavior aligned across languages.

This repository currently ships SDKs for:

- `sdks/go`
- `sdks/python`
- `sdks/rust`
- `sdks/jvm`
- `sdks/dotnet`

If the task is about operator release steps, also read [docs/contributing/releasing-sdks.md](../../docs/contributing/releasing-sdks.md).

## Durable Constraints

Keep these rules in mind:

- preserve semantic parity across languages:
  language-specific APIs may look idiomatic, but transport behavior, protocol fields, path handling, and registration semantics should stay aligned
- avoid extra package variants unless the ecosystem clearly requires them:
  do not introduce `pure`, BOM, browser-only, or similar split artifacts by default
- treat package names, import namespaces, install commands, and version strings as user-facing contract:
  update the SDK README plus the matching docs pages when any of those change
- keep shared correctness logic centralized inside each SDK:
  path normalization, protocol encoding/decoding, and registry behavior should not be reimplemented ad hoc at call sites
- when one SDK needs a transport or protocol fix, audit the equivalent code in the other SDKs before declaring the change local-only

## Common SDK Pitfalls

These are recurring failure modes that deserve explicit review and tests:

- HTTP loop URLs must join cleanly with trailing-slash base URLs:
  `https://host/` and `https://host/base/` must not become double-slash loop endpoints
- reusable transports need strict lifecycle behavior:
  either reject a second `Connect()` while a session is active or tear the old session down before replacing it
- reconnects must reset one-shot lifecycle guards:
  close callbacks and connection-state cleanup must still fire after the first disconnect/reconnect cycle
- remote disconnects and local disconnects should both clear connection state consistently
- duplicate connect, reconnect-after-close, and trailing-slash endpoint cases should be covered by unit tests for each transport implementation

## Cross-Language Review Checklist

When reviewing or extending one SDK, check these before finishing:

- endpoint registration and invocation behavior still match the other SDKs
- transport auth, headers, and loop semantics still match the protocol expectations
- path validation and normalization still accept and reject the same shapes
- example code and quick-start snippets still match the real package coordinates
- English and `zh-Hans` SDK docs stay in sync with the changed package surface

## Release and Registry Constraints

Shared SDK releases have a few non-obvious constraints:

- the shared `v*` tag must match the versioned manifests checked by `scripts/validate-release-versions.mjs`
- Go is source-distributed:
  the release workflow also needs the prefixed `sdks/go/v<version>` tag on the same commit
- GitHub Release notes do not automatically list PyPI, crates.io, NuGet, or Maven Central packages:
  if the release page should show install commands or package links, write that body explicitly in the workflow
- PyPI requires a verified email and 2FA before token creation
- crates.io requires a verified email before publish
- Maven Central requires three separate things before first publish:
  a Portal user token, verified namespace ownership, and a signing key that is discoverable from a supported public keyserver
- GitHub-backed Sonatype namespace verification may require a temporary public repository under the same owner
- NuGet may block publishing until the account email is confirmed, and the API key must allow pushing new packages as well as new versions
- npm auth is registry-host sensitive:
  make sure CI writes auth for the same npm host shape that the account token expects

## Validation

For narrow SDK changes, prefer the smallest relevant checks:

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

If a change crosses SDKs and shared repo surfaces, follow [.ai/rules/change-strategy.md](./change-strategy.md) and [.ai/rules/validation.md](./validation.md) after the SDK-local checks.
