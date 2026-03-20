---
layout: home

hero:
  name: "MDP"
  text: "模型驱动协议"
  tagline: "通过 client 注册与 MCP bridge tools，把运行时内部过程调用暴露给 AI 的协议。"
  actions:
    - theme: brand
      text: "快速使用"
      link: /zh-Hans/guide/quick-start
    - theme: alt
      text: "JavaScript SDK"
      link: /zh-Hans/sdk/javascript/quick-start

features:
  - title: "跨运行时"
    details: "Android、iOS、Qt、后端服务和浏览器运行时都可以通过同一套协议暴露能力。"
  - title: "Client 驱动"
    details: "能力由 client 注册，包括 tools、prompts、skills 和 resources。server 只负责索引和路由。"
  - title: "MCP bridge"
    details: "server 保持轻量，对上暴露稳定的 bridge tools，例如 listClients、callTools 和 readResource。"
---

## 这是什么

MDP 是一个面向 AI 的语言无关协议，用来暴露运行时内部的过程调用。它适合那些能力本来就存在于某个运行时、设备或进程内，不适合被重写成独立服务的场景。

## 从这里开始

- 从[快速使用](/zh-Hans/guide/quick-start)开始，先跑通最短链路。
- 阅读[什么是 MDP？](/zh-Hans/guide/introduction)了解协议要解决的问题。
- 查看 [Server / Tools](/zh-Hans/server/tools) 理解固定的 MCP bridge surface。
- 如果你要从浏览器或本地进程接入，先看 [JavaScript SDK / 简易上手](/zh-Hans/sdk/javascript/quick-start)。
