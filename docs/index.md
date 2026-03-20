---
layout: home

hero:
  name: "MDP"
  text: "Model Drive Protocol"
  tagline: "A protocol for exposing runtime internal procedures to AI through client registration and MCP bridge tools."
  actions:
    - theme: brand
      text: "Quick Start"
      link: /guide/quick-start
    - theme: alt
      text: "JavaScript SDK"
      link: /sdk/javascript/quick-start

features:
  - title: "Cross-runtime"
    details: "Android, iOS, Qt, backend services, and browser runtimes can all expose capabilities with the same protocol."
  - title: "Client-driven"
    details: "Clients register tools, prompts, skills, and resources. The server indexes and routes them."
  - title: "MCP bridge"
    details: "The server stays thin and exposes stable bridge tools like listClients, callTools, and readResource."
---

## What this is

MDP is a language-neutral protocol for exposing internal procedures to AI. It is designed for environments where the procedure lives inside a runtime, device, or process that should not be rebuilt as a standalone service.

## Start here

- Start with the [quick start](/guide/quick-start) for the shortest end-to-end path.
- Read [what MDP is](/guide/introduction) to understand the problem and scope.
- Review the [server tools](/server/tools) page for the fixed MCP bridge surface.
- Use the [JavaScript SDK quick start](/sdk/javascript/quick-start) when you want to expose capabilities from a browser or local process.
