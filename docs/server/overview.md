---
title: Overview
status: MVP
---

# Server Overview

The server is intentionally thin.

Its responsibilities are:

- manage client sessions
- keep an in-memory registry
- index capabilities by kind and name
- expose MCP bridge tools
- route calls to clients and collect results
- optionally mirror locally connected clients into one upstream MDP server

The server should not know whether the client is implemented in Swift, Kotlin, C++, JavaScript, or Python.

Even in upstream proxy mode, the server is still not the capability owner. It only accepts registrations, mirrors descriptors, and forwards invocations.

For startup topologies and cluster-mode flags, see [Deployment Modes](/server/deployment).
