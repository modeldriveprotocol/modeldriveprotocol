---
title: Tools
status: MVP
---

# Tools

The server exposes one fixed MCP bridge surface. It does not generate one MCP tool per registered capability.

## Read by task

| Task                                            | Start here                                                                                                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| See which clients are online                    | [listClients](/server/tools/list-clients)                                                                                                                                |
| See the canonical path catalog                  | [listPaths](/server/tools/list-paths)                                                                                                                                     |
| Invoke one exact path on one exact client       | [callPath](/server/tools/call-path)                                                                                                                                       |
| Fan out one path invocation to multiple clients | [callPaths](/server/tools/call-paths)                                                                                                                                     |
| Need migration context for legacy aliases       | Read the compatibility note below                                                                                                                                        |

## Discovery tools

| Tool                                      | Returns                                            | Notes                                                                |
| ----------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| [listClients](/server/tools/list-clients) | Connected client summaries and connection metadata | Supports case-insensitive `search` across client fields and catalog  |
| [listPaths](/server/tools/list-paths)     | Canonical indexed path descriptors                 | Supports `clientId`, `search`, and `depth`; default depth is one     |

## Invocation tools

| Tool                                        | Use when                                               |
| ------------------------------------------- | ------------------------------------------------------ |
| [callPath](/server/tools/call-path)         | You know one client ID plus one exact `method + path`  |
| [callPaths](/server/tools/call-paths)       | You want canonical fan-out by `method + path`          |

## Compatibility aliases

The server still exposes legacy alias names such as `listTools`, `listPrompts`, `listSkills`, `listResources`, `callTools`, `getPrompt`, `callSkills`, `readResource`, and `callClients` for migration.
They are compatibility shims on top of the canonical path model and are intentionally not documented as first-class pages anymore.

`auth` is forwarded to the client as `callClient.auth`:

```json
{
  "scheme": "Bearer",
  "token": "client-session-token",
  "headers": {
    "x-mdp-auth-tenant": "demo"
  },
  "metadata": {
    "role": "operator"
  }
}
```

Legacy invocation aliases continue to accept `args` plus optional `auth`.

## Direct HTTP skill reads

Skill documents can also be read directly over HTTP:

```bash
curl 'http://127.0.0.1:47372/skills/client-01/workspace/review'
curl 'http://127.0.0.1:47372/client-01/skills/workspace/review/files?topic=mdp'
```

Those routes resolve one exact skill node and return the skill body directly, commonly as `text/markdown`.
