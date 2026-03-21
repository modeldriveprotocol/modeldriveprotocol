---
title: Protocol 开发指南
status: Draft
---

# Protocol 开发指南

当你开发 `packages/protocol` 时，使用这页。

## 这个模块负责什么

`packages/protocol` 是纯协议层，负责：

- 消息 schema
- capability 描述结构
- 序列化错误模型
- guards 和校验辅助函数

## 构建与测试

先用 package 级命令：

```bash
pnpm --filter @modeldriveprotocol/protocol build
pnpm --filter @modeldriveprotocol/protocol test
```

## 常见开发回路

当改动影响的是协议契约，而不是某个运行时实现时，优先从这里开始。

常见回路：

1. 修改 `src/models.ts`、`src/messages.ts`、`src/errors.ts` 或 `src/guards.ts`
2. 更新 `packages/protocol/test` 下的聚焦测试
3. 重新构建协议包
4. 再去更新消费这些契约的 server 或 client

## 调试预期

这个 package 没有需要单独启动的 runtime。调试方式主要是：

- 观察生成出来的类型和消息结构
- 运行协议层测试
- 检查 `packages/client` 和 `packages/server` 的编译与测试影响

如果协议改动跨层，建议按这个顺序验证：

```bash
pnpm --filter @modeldriveprotocol/protocol test
pnpm --filter @modeldriveprotocol/client test
pnpm --filter @modeldriveprotocol/server test
pnpm test
```
