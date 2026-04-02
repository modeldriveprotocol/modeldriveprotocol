# Vercel AI SDK CLI Agent Example

这个示例演示一条最小链路：

用户命令 -> CLI agent -> mock LLM -> MCP tool call -> MDP server bridge -> MDP client tool -> 返回结果 -> mock LLM 组织最终回复 -> CLI 打印

## 前置条件

先在仓库根目录执行一次：

```bash
pnpm install
```

不需要全局安装 `mdp`。

这个示例会直接使用仓库里的本地 MDP server/runtime；如果缺少构建产物，会自动执行局部 build。相关产物是：

- `packages/server/dist/cli.js`
- `apps/nodejs-simple-mdp-client/dist/index.js`

## 运行

在仓库根目录执行：

```bash
pnpm --dir examples/vercel-ai-cli-agent start -- get-package-version
```

输出类似：

```text
版本是 2.0.0。
```

也支持下面这种关键词形式：

```bash
pnpm --dir examples/vercel-ai-cli-agent start -- 调用get-package-version
```

如果你把这个示例包 link 到全局 PATH，也可以直接执行：

```bash
mdp-test get-package-version
```

## 说明

- 默认会配置一个名为 `mdp` 的 MCP server
- 不依赖真实 LLM 接口，内部使用 `ai/test` 的 `MockLanguageModelV3`
- MDP client 复用了仓库里的 `nodejs-simple-mdp-client`
- 通过 `mcpClient.tools()` 直接自动发现 MDP MCP tools，没有在示例里额外定义本地 tool schema
- agent 会直接调用 runtime 的 canonical endpoint `/workspace/package-manifest`
- 整个链路只经过 bridge 的 `callPath`
- 示例默认读取的是 `packages/server/package.json` 的版本号，所以可以稳定得到 `2.0.0` 这类结果
