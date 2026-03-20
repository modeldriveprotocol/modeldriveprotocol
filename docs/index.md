---
layout: home

hero:
  name: "MDP"
  text: "Model Drive Protocol"
  tagline: "A protocol for exposing runtime internal procedures to AI through client registration and MCP bridge tools."
  actions:
    - theme: brand
      text: "Learn the protocol"
      link: /guide/introduction
    - theme: alt
      text: "Build a server"
      link: /server/mvp-design

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

- Read the [introduction](/guide/introduction) for the problem statement.
- Review the [architecture](/guide/architecture) for client/server boundaries.
- Inspect the [message schema](/protocol/message-schema) for the wire format.
- Follow the [server MVP](/server/mvp-design) to implement a first working stack.

