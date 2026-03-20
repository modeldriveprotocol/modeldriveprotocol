---
title: API
status: Draft
---

# API

The server-side API should stay narrow:

- register client
- unregister client
- list client registry
- query capability indexes
- route `callClient`

Internal structure can be split into registry, capability index, and invocation router, but the external surface should stay stable.

