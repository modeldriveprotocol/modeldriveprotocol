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
| See a capability catalog by kind                | [listTools](/server/tools/list-tools), [listPrompts](/server/tools/list-prompts), [listSkills](/server/tools/list-skills), [listResources](/server/tools/list-resources) |
| Invoke one exact capability on one exact client | [callTools](/server/tools/call-tools), [getPrompt](/server/tools/get-prompt), [callSkills](/server/tools/call-skills), [readResource](/server/tools/read-resource)       |
| Fan out one invocation to multiple clients      | [callClients](/server/tools/call-clients)                                                                                                                                |

## Discovery tools

| Tool                                          | Returns                                            |
| --------------------------------------------- | -------------------------------------------------- |
| [listClients](/server/tools/list-clients)     | Connected client summaries and connection metadata |
| [listTools](/server/tools/list-tools)         | Indexed tool descriptors                           |
| [listPrompts](/server/tools/list-prompts)     | Indexed prompt descriptors                         |
| [listSkills](/server/tools/list-skills)       | Indexed skill descriptors                          |
| [listResources](/server/tools/list-resources) | Indexed resource descriptors                       |

## Invocation tools

| Tool                                        | Use when                                               |
| ------------------------------------------- | ------------------------------------------------------ |
| [callTools](/server/tools/call-tools)       | You know one client ID and one tool name               |
| [getPrompt](/server/tools/get-prompt)       | You know one client ID and one prompt name             |
| [callSkills](/server/tools/call-skills)     | You know one client ID and one skill name              |
| [readResource](/server/tools/read-resource) | You know one client ID and one resource URI            |
| [callClients](/server/tools/call-clients)   | You want a generic entry point or multi-client fan-out |

## Shared input fields

Most invocation tools accept optional `args` and `auth`.

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

`args` is a free-form JSON object:

```json
{
  "query": "mdp",
  "limit": 10
}
```

## Shared result shapes

Most invocation tools return one of these shapes:

Success:

```json
{
  "ok": true,
  "data": {}
}
```

Failure:

```json
{
  "ok": false,
  "error": {
    "code": "handler_error",
    "message": "Something failed"
  }
}
```

Discovery tools return named arrays such as `clients`, `tools`, `prompts`, `skills`, or `resources`.

## Direct HTTP skill reads

Skill documents can also be read directly over HTTP:

```bash
curl 'http://127.0.0.1:7070/skills/client-01/workspace/review'
curl 'http://127.0.0.1:7070/client-01/skills/workspace/review/files?topic=mdp'
```

Those routes resolve one exact skill node and return the skill body directly, commonly as `text/markdown`.
