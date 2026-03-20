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

The server should not know whether the client is implemented in Swift, Kotlin, C++, JavaScript, or Python.

