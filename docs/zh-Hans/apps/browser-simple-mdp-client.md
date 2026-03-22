---
title: Browser Simple MDP Client
status: MVP
---

# Browser Simple MDP Client

`@modeldriveprotocol/browser-simple-mdp-client` 是这个仓库里最小的一种浏览器打包运行时。

如果你希望直接在一个普通 HTML 页面里接入预构建 client，而不是先自己写一套浏览器 client 代码，这个包就是最短路径。

## 最快启动方式

页面里直接放这两段脚本：

```html
<script src="https://cdn.jsdelivr.net/npm/@modeldriveprotocol/client@latest/dist/modeldriveprotocol-client.global.js"></script>
<script
  src="https://cdn.jsdelivr.net/npm/@modeldriveprotocol/browser-simple-mdp-client@latest/dist/browser-simple-mdp-client.global.js"
  attr-mdp-server-url="ws://127.0.0.1:47372"
  attr-mdp-client-id="browser-simple-01"
  attr-mdp-client-name="Browser Simple Client"
  attr-mdp-client-description="最小浏览器 MDP client"
></script>
```

第一段脚本加载浏览器 SDK 全局对象。第二段脚本启动这个预构建 client，并自动注册它内置的一组能力。

## 它能做什么

- 读取当前页面的标题、URL、路径、hash 和 query 参数
- 按 CSS selector 点击一个页面元素
- 在当前页面调用一次 `alert()`
- 暴露一组 skill 文档，方便 host 理解这些工具怎么用

## 适合什么场景

这些情况下，优先用这个包：

- 你想用最短路径完成浏览器端 demo
- 你希望直接通过 CDN 使用浏览器 client，而不是先搭自定义构建
- 你只需要一组最小的页面读取和交互能力

如果你需要自定义 tools、prompts、resources，或者想自己控制 auth 和 transport，继续阅读 [JavaScript / 如何使用](/zh-Hans/sdk/javascript/usage)。
如果你想直接看一个仓库里的浏览器示例说明页，可以打开 [Browser Client](/zh-Hans/examples/browser-client)。
如果你更想要浏览器插件这种运行时，而不是页面内脚本，继续阅读 [Chrome 插件](/zh-Hans/apps/chrome-extension)。
