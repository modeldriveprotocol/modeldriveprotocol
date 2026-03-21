---
layout: home

hero:
  name: "MDP"
  text: "模型驱动协议"
  tagline: "模型与万物建立连接的终极方案"
  image:
    src: /assets/mdp-home-hero.svg
    alt: "展示 MDP 连接模型与运行时的抽象示意图"
  actions:
    - theme: brand
      text: "快速使用"
      link: /zh-Hans/guide/quick-start
    - theme: alt
      text: "Playground"
      link: /zh-Hans/playground/
    - theme: alt
      text: "JavaScript SDK"
      link: /zh-Hans/sdk/javascript/quick-start

features:
  - icon: '<svg class="mdp-home-feature-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="6.5" r="2.5"/><circle cx="12" cy="17.5" r="2.5"/><path d="M8.5 8.3 10.6 11.5"/><path d="M15.5 8.3 13.4 11.5"/><path d="M12 15v0"/></svg>'
    title: "工具集按单页拆开"
    details: "每个 bridge 工具都有独立文档页，不再把所有内容堆在一个长页面里。"
    link: /zh-Hans/server/tools/
    linkText: "查看工具集"
  - icon: '<svg class="mdp-home-feature-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 7v10l-7 4-7-4V7l7-4Z"/><path d="M5 7l7 4 7-4"/><path d="M12 11v10"/></svg>'
    title: "对外接口分层阅读"
    details: "先看建立链接，再看每个外部接口的独立说明，定位更直接。"
    link: /zh-Hans/server/api/
    linkText: "查看对外接口"
  - icon: '<svg class="mdp-home-feature-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 15 15.5 8.5c1.5-1.5 3.3-2.6 5.3-3-.4 2-1.5 3.8-3 5.3L11.3 17H7l2-2Z"/><path d="M13.5 10.5 16.5 13.5"/><path d="M7.5 16.5c-.1 1.4-.7 2.6-1.8 3.7 1.1-1.1 2.3-1.7 3.7-1.8"/></svg>'
    title: "协议标准单独成组"
    details: "从服务端视角切入，再跳转到底层协议页，路径更清楚。"
    link: /zh-Hans/server/protocol
    linkText: "查看协议标准"
---

<section class="mdp-home-screen mdp-home-screen--band">
  <div class="mdp-home-band">
    <div class="mdp-home-band-copy">
      <span class="mdp-home-eyebrow">适用于浏览器、IDE、应用、本地 Agent</span>
      <h2>让模型直接调用运行时能力。</h2>
      <p>不需要把浏览器、IDE、应用或本地进程重写成服务，只要把能力注册出来，再通过固定 bridge 交给 AI 调用。</p>
    </div>
    <div class="mdp-home-band-metrics">
      <div class="mdp-home-metric">
        <strong>1</strong>
        <span>套稳定 bridge 供 host 接入</span>
      </div>
      <div class="mdp-home-metric">
        <strong>4</strong>
        <span>类能力：tools / prompts / skills / resources</span>
      </div>
      <div class="mdp-home-metric">
        <strong>2</strong>
        <span>种传输：WebSocket / HTTP loop</span>
      </div>
    </div>
  </div>
</section>

<section class="mdp-home-screen mdp-home-screen--path">
  <div class="mdp-home-screen-header">
    <span class="mdp-home-screen-kicker">01</span>
    <div>
      <h2>先选一条入口</h2>
      <p>先选入口，再决定往哪一层深入。</p>
    </div>
  </div>
  <div class="mdp-home-grid">
    <a class="mdp-home-card" href="/zh-Hans/guide/quick-start">
      <span class="mdp-home-card-kicker">先跑通</span>
      <h3>快速使用</h3>
      <p>最快跑通一条端到端链路。</p>
    </a>
    <a class="mdp-home-card" href="/zh-Hans/server/tools/">
      <span class="mdp-home-card-kicker">精确接入</span>
      <h3>工具集</h3>
      <p>按工具逐个查看 bridge 工具的作用、入参和出参。</p>
    </a>
    <a class="mdp-home-card" href="/zh-Hans/server/api/">
      <span class="mdp-home-card-kicker">理解接口</span>
      <h3>对外接口</h3>
      <p>先看建立链接，再看每一个外部接口的单页说明。</p>
    </a>
    <a class="mdp-home-card" href="/zh-Hans/server/protocol">
      <span class="mdp-home-card-kicker">理解协议</span>
      <h3>协议标准</h3>
      <p>从服务端实现关心的协议元素继续深入到底层协议页。</p>
    </a>
    <a class="mdp-home-card" href="/zh-Hans/sdk/javascript/quick-start">
      <span class="mdp-home-card-kicker">嵌入运行时</span>
      <h3>JavaScript SDK</h3>
      <p>把 MDP 接进浏览器、本地进程或自定义运行时。</p>
    </a>
    <a class="mdp-home-card" href="/zh-Hans/playground/">
      <span class="mdp-home-card-kicker">直接试试看</span>
      <h3>Playground</h3>
      <p>直接试连接，观察 capability 行为。</p>
    </a>
  </div>
</section>

<section class="mdp-home-screen mdp-home-screen--flow">
  <div class="mdp-home-screen-header">
    <span class="mdp-home-screen-kicker">02</span>
    <div>
      <h2>典型链路</h2>
      <p>从运行时到 Agent，只需要四步。</p>
    </div>
  </div>
  <div class="mdp-home-flow">
    <div class="mdp-home-step">
      <span class="mdp-home-step-index">01</span>
      <h3>配置 bridge</h3>
      <p>启动 server CLI，并配置到 MCP 工具里。</p>
    </div>
    <div class="mdp-home-step">
      <span class="mdp-home-step-index">02</span>
      <h3>连接运行时</h3>
      <p>让一个或多个 client 连上来。</p>
    </div>
    <div class="mdp-home-step">
      <span class="mdp-home-step-index">03</span>
      <h3>注册能力</h3>
      <p>注册 tools、prompts、skills、resources。</p>
    </div>
    <div class="mdp-home-step">
      <span class="mdp-home-step-index">04</span>
      <h3>通过 MCP 调用</h3>
      <p>在支持 MCP 的工具里对话并调用它们。</p>
    </div>
  </div>
</section>

<section class="mdp-home-screen mdp-home-screen--fit">
  <div class="mdp-home-screen-header">
    <span class="mdp-home-screen-kicker">03</span>
    <div>
      <h2>适合的场景</h2>
      <p>适合能力必须留在运行时里的场景。</p>
    </div>
  </div>
  <div class="mdp-home-fit-list">
    <div class="mdp-home-fit">浏览器页面或扩展里的会话能力</div>
    <div class="mdp-home-fit">依赖 IDE 与本地工作区状态的能力</div>
    <div class="mdp-home-fit">应用本地、设备本地、进程本地的操作</div>
    <div class="mdp-home-fit">需要被 MCP 访问的本地 agent 或后端流程</div>
  </div>
  <div class="mdp-home-note">
    需要精确格式时，直接看 <a href="/zh-Hans/server/tools/">工具集</a>、<a href="/zh-Hans/server/api/">对外接口</a>、<a href="/zh-Hans/server/protocol">协议标准</a>，或去 <a href="/zh-Hans/playground/">Playground</a>。
  </div>
</section>
