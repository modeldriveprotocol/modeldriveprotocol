---
title: Security
status: Draft
---

# Security

MDP assumes clients may expose sensitive local state, so the server has to treat registration and invocation as policy boundaries.

## Auth entry points

The current server can receive auth from multiple places:

- transport headers such as `Authorization`, `Cookie`, and `x-mdp-auth-*`
- `POST /mdp/auth`, which issues an `HttpOnly` cookie for browser websocket bootstrap
- `registerClient.auth` for message-level registration auth
- `callClient.auth` for invocation-time auth forwarded to the client

## Authorization hooks

The runtime exposes two explicit policy hooks:

- `authorizeRegistration`
- `authorizeInvocation`

These hooks receive session context plus any transport-level or message-level auth the server has observed.

## TLS and secure endpoints

To expose secure transport endpoints, start the CLI with a certificate and key:

```bash
npx @modeldriveprotocol/server --port 47372 --tls-key ./certs/server-key.pem --tls-cert ./certs/server-cert.pem
```

With TLS enabled, the server endpoints become:

- `wss://127.0.0.1:47372`
- `https://127.0.0.1:47372/mdp/http-loop`
- `https://127.0.0.1:47372/mdp/auth`
- `https://127.0.0.1:47372/mdp/meta`

## Operational safeguards

The baseline server behavior also includes:

- heartbeat-driven disconnect cleanup
- invocation timeouts
- session replacement when the same client ID reconnects
- capability discovery that reports auth presence, but not secret values

For transport-level details, see [Security](/protocol/security) and [Transport](/protocol/transport).
For layered hub and edge startup patterns, see [Deployment Modes](/server/deployment).
