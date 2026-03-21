---
title: Environment Overview
status: Draft
---

# Environment Overview

Use this page when you need to understand which development environments exist in this repository.

The structure here should stay extensible. Today the repository only requires a Node.js environment, but future modules may add dedicated environments such as Go or Rust.

## Current environment matrix

| Environment | Status | Used by |
| --- | --- | --- |
| Node.js | Required | protocol, client, server, docs, extensions, scripts |
| Go | Not used yet | reserved for future modules |
| Rust | Not used yet | reserved for future modules |

## What exists today

Today the repository only has one real development environment:

- `Node.js`
  used by protocol, client, server, SDK build output, docs, apps, and repo scripts

## Future environments

If the repository later adds modules that depend on Go, Rust, or other runtimes, add them here as separate subsections instead of overloading the Node.js page.

## Related page

- [Node.js](/contributing/setup/nodejs)
