---
title: 环境介绍
status: Draft
---

# 环境介绍

这页的作用是先说明这个仓库有哪些开发环境。

这里的结构需要保留扩展性。当前仓库实际上只依赖 Node.js 环境，但后续如果新增 Go、Rust 等模块，也应该继续在这一组文档下补对应环境。

## 当前环境矩阵

| 环境    | 状态     | 目前用途                                            |
| ------- | -------- | --------------------------------------------------- |
| Node.js | 必需     | protocol、client、server、docs、extensions、scripts |
| Go      | 暂未使用 | 预留给未来模块                                      |
| Rust    | 暂未使用 | 预留给未来模块                                      |

## 当前实际存在的环境

当前仓库实际上只有一个真正使用中的开发环境：

- `Node.js`
  用于 protocol、client、server、SDK 构建、docs、apps 和 repo 级 scripts

## 后续扩展

如果仓库后续新增依赖 Go、Rust 或其他运行时的模块，应当继续在这页下面补新的环境小节，而不是把所有说明都塞进 Node.js 环境里。

## 相关页面

- [Node.js](/zh-Hans/contributing/setup/nodejs)
