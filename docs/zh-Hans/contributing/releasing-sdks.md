---
title: 多语言 SDK 包发布
status: Draft
---

# 多语言 SDK 包发布

当你要通过共享 release workflow 发布 `sdks/**` 下的 SDK 包时，使用这页。

当前覆盖：

- `sdks/go`
- `sdks/python`
- `sdks/rust`
- `sdks/jvm`
- `sdks/dotnet`

## 操作步骤

1. 准备 SDK 代码改动，并把版本号提升到要发布的版本。
2. 合并发布提交到 `main`。
3. 创建并推送一个类似 `v2.2.0` 的 tag。
4. GitHub Actions 运行 `.github/workflows/release.yml`。

## workflow 会做什么

- 校验 release tag 和这些版本号一致：
  - workspace npm packages
  - `sdks/python/pyproject.toml`
  - `sdks/rust/Cargo.toml`
  - `sdks/jvm/gradle.properties`
  - `sdks/dotnet/Directory.Build.props`
- 测试 Go SDK，并为当前 release commit 生成带前缀的 Go module tag
- 构建并测试仓库里的 npm packages
- 构建并测试 Python SDK
- 构建并测试 Rust SDK
- 构建并测试 JVM SDKs
- 构建、测试并打包 .NET SDK
- 只有在配置了对应 registry 凭据时才执行真实发布
- 创建或更新对应的 GitHub Release

Go SDK 通过仓库源码分发。每次共享 `v*` release 时，workflow 还会额外创建 `sdks/go/v<version>`，这样 `go get github.com/modeldriveprotocol/modeldriveprotocol/sdks/go/v2@v<version>` 可以直接解析。

## 仓库必须配置的凭据

Go：

- 不需要额外 registry secret
- workflow 需要具备 `contents: write` 才能推送 Go tag

Python：

- secret `PYPI_API_TOKEN`

Rust：

- secret `CARGO_REGISTRY_TOKEN`

JVM：

- secret `MAVEN_PUBLISH_URL`
- secret `MAVEN_PUBLISH_USERNAME`
- secret `MAVEN_PUBLISH_PASSWORD`
- 可选 `MAVEN_SIGNING_KEY`
- 可选 `MAVEN_SIGNING_PASSWORD`

.NET：

- secret `NUGET_API_KEY`

## 打 tag 前的本地校验

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

## 常见发布失败原因

- 版本不一致：
  共享 tag 和某个声明了版本号的 SDK manifest 不一致
- Go tag 推送失败：
  workflow 没有成功把 `sdks/go/v<version>` 打到 release commit 上
- publish 被跳过：
  workflow 没有找到这个语言对应的 registry secret
- Python 上传被拒绝：
  PyPI 上已经存在相同包名或版本号
- crates.io 上传被拒绝：
  crate 名称或版本已经存在，或者 packaging metadata 不完整
- Maven 发布失败：
  仓库凭据或签名配置缺失或无效
- NuGet 发布失败：
  `NUGET_API_KEY` 缺失、无效，或者包版本已经存在

## 首轮 SDK 发版的维护经验

- 不要复用已经存在的共享 release tag：
  如果 GitHub 上已经有 `v2.2.0`，就先把所有可发布 package 和 SDK manifest 的版本号整体提升，再重新发版
- 用 CDP 操作浏览器时，每个 registry 保留一个固定 tab：
  PyPI 和 Sonatype 的验证流程都不是一步完成，复用原 tab 比不断新开页稳定得多
- PyPI 不是拿到登录态就能直接建 token：
  先验证主邮箱，再开启 2FA，最后才能创建 API token
- PyPI 的 TOTP 开通路径有三步：
  先生成 recovery codes，再消费一条 recovery code 证明已经妥善保存，最后再绑定 authenticator app
- Sonatype Central 有两条独立前置条件：
  一条是生成 Portal user token 用来发布，另一条是第一次发布前先把 namespace 验证通过
- GitHub 托管的 Sonatype namespace 需要临时公开仓库校验：
  `io.github.modeldriveprotocol` 这次是通过在同一 GitHub owner 下创建 verification key 同名仓库完成的
- Maven Central 默认按带签名发布来准备最稳妥：
  提前配置 `MAVEN_SIGNING_KEY` 和 `MAVEN_SIGNING_PASSWORD`，并把公钥上传到受支持的 keyserver
- NuGet 可能会先卡邮箱确认，确认前拿不到可用的 API key
- 共享 release workflow 对各语言的行为不完全相同：
  npm 发布在这条链路里是硬要求，Python、Rust、JVM、.NET 在 secret 缺失时会直接跳过对应发布步骤
- Go 不是发到外部 registry，而是跟着仓库源码 tag 一起发：
  workflow 会在 release commit 上额外创建 `sdks/go/v<version>`，所以 tag 推送权限必须是通的
