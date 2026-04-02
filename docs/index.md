---
layout: home

hero:
  name: "MDP"
  text: "Model Drive Protocol"
  tagline: "The ultimate solution for connecting models with everything."
  image:
    src: /assets/mdp-home-hero.svg
    alt: "Abstract diagram of MDP connecting models and runtimes"
  actions:
    - theme: brand
      text: "Quick Start"
      link: /guide/quick-start
    - theme: alt
      text: "Playground"
      link: /playground/
    - theme: alt
      text: "JavaScript SDK"
      link: /sdk/javascript/quick-start

features:
  - icon: '<svg class="mdp-home-feature-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="6.5" r="2.5"/><circle cx="12" cy="17.5" r="2.5"/><path d="M8.5 8.3 10.6 11.5"/><path d="M15.5 8.3 13.4 11.5"/><path d="M12 15v0"/></svg>'
    title: "Structured Tool Catalog"
    details: "Read the bridge surface by individual tool instead of scanning one long aggregate page."
    link: /server/tools/
    linkText: "See tools"
  - icon: '<svg class="mdp-home-feature-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 7v10l-7 4-7-4V7l7-4Z"/><path d="M5 7l7 4 7-4"/><path d="M12 11v10"/></svg>'
    title: "Split Client APIs"
    details: "Connection setup and external interfaces are separated so transport details are easier to navigate."
    link: /server/api/
    linkText: "See APIs"
  - icon: '<svg class="mdp-home-feature-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 15 15.5 8.5c1.5-1.5 3.3-2.6 5.3-3-.4 2-1.5 3.8-3 5.3L11.3 17H7l2-2Z"/><path d="M13.5 10.5 16.5 13.5"/><path d="M7.5 16.5c-.1 1.4-.7 2.6-1.8 3.7 1.1-1.1 2.3-1.7 3.7-1.8"/></svg>'
    title: "Protocol Reference"
    details: "Jump from server behavior into the underlying protocol lifecycle and message model."
    link: /server/protocol
    linkText: "See protocol"
---

<section class="mdp-home-screen mdp-home-screen--band">
  <div class="mdp-home-band">
    <div class="mdp-home-band-copy">
      <span class="mdp-home-eyebrow">For Browsers, IDEs, Apps, and Local Agents</span>
      <h2>Let models call runtime capabilities directly.</h2>
      <p>You do not need to rebuild browsers, IDEs, apps, or local processes as services. Register the capability, then expose it through one fixed bridge.</p>
    </div>
    <div class="mdp-home-band-metrics">
      <div class="mdp-home-metric">
        <strong>1</strong>
        <span>stable bridge for every host</span>
      </div>
      <div class="mdp-home-metric">
        <strong>3</strong>
        <span>path types: endpoints / prompts / skills</span>
      </div>
      <div class="mdp-home-metric">
        <strong>2</strong>
        <span>transport modes: WebSocket / HTTP loop</span>
      </div>
    </div>
  </div>
</section>

<section class="mdp-home-screen mdp-home-screen--path">
  <div class="mdp-home-screen-header">
    <span class="mdp-home-screen-kicker">01</span>
    <div>
      <h2>Pick A Path</h2>
      <p>Pick the entry point, then go deeper only when you need to.</p>
    </div>
  </div>
  <div class="mdp-home-grid">
    <a class="mdp-home-card" href="/guide/quick-start">
      <span class="mdp-home-card-kicker">Start Fast</span>
      <h3>Quick Start</h3>
      <p>The fastest end-to-end path.</p>
    </a>
    <a class="mdp-home-card" href="/server/tools/">
      <span class="mdp-home-card-kicker">Integrate Precisely</span>
      <h3>Tools</h3>
      <p>Browse each bridge tool as its own reference page.</p>
    </a>
    <a class="mdp-home-card" href="/server/api/">
      <span class="mdp-home-card-kicker">Talk to the Runtime</span>
      <h3>APIs</h3>
      <p>Read connection setup separately from the external interfaces.</p>
    </a>
    <a class="mdp-home-card" href="/sdk/javascript/quick-start">
      <span class="mdp-home-card-kicker">Embed MDP</span>
      <h3>JavaScript SDK</h3>
      <p>Embed MDP into browsers, local processes, or custom runtimes.</p>
    </a>
    <a class="mdp-home-card" href="/playground/">
      <span class="mdp-home-card-kicker">Try It Live</span>
      <h3>Playground</h3>
      <p>Try connections and inspect path behavior.</p>
    </a>
  </div>
</section>

<section class="mdp-home-screen mdp-home-screen--flow">
  <div class="mdp-home-screen-header">
    <span class="mdp-home-screen-kicker">02</span>
    <div>
      <h2>Typical Flow</h2>
      <p>From runtime to agent in four steps.</p>
    </div>
  </div>
  <div class="mdp-home-flow">
    <div class="mdp-home-step">
      <span class="mdp-home-step-index">01</span>
      <h3>Configure the bridge</h3>
      <p>Start the server CLI and configure it in your MCP tool.</p>
    </div>
    <div class="mdp-home-step">
      <span class="mdp-home-step-index">02</span>
      <h3>Connect runtimes</h3>
      <p>Connect one or more clients.</p>
    </div>
    <div class="mdp-home-step">
      <span class="mdp-home-step-index">03</span>
      <h3>Register path catalogs</h3>
      <p>Register endpoints, prompts, and skills.</p>
    </div>
    <div class="mdp-home-step">
      <span class="mdp-home-step-index">04</span>
      <h3>Call them through MCP</h3>
      <p>Use them from any MCP-capable tool.</p>
    </div>
  </div>
</section>

<section class="mdp-home-screen mdp-home-screen--fit">
  <div class="mdp-home-screen-header">
    <span class="mdp-home-screen-kicker">03</span>
    <div>
      <h2>Good Fits</h2>
      <p>Best when the capability must stay inside the runtime that owns it.</p>
    </div>
  </div>
  <div class="mdp-home-fit-list">
    <div class="mdp-home-fit">Browser and extension session capabilities</div>
    <div class="mdp-home-fit">IDE features tied to local workspace state</div>
    <div class="mdp-home-fit">App-local, device-local, or process-local actions</div>
    <div class="mdp-home-fit">Local agent or backend flows exposed through MCP</div>
  </div>
  <div class="mdp-home-note">
    Need exact formats? Go to <a href="/server/tools/">Tools</a>, <a href="/server/api/">APIs</a>, <a href="/server/protocol">Protocol Reference</a>, or <a href="/playground/">Playground</a>.
  </div>
</section>
