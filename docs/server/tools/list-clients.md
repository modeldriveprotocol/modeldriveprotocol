---
title: listClients
status: MVP
---

# `listClients`

Use `listClients` to inspect the current registry state and see which MDP clients are online.

In clustered startup modes, the MCP bridge forwards this call to the current leader when needed, so the result reflects the active cluster view instead of only the local node.

## Input

`listClients` takes no input fields.

```json
{}
```

## Output

```json
{
  "clients": []
}
```

Each item in `clients` is a `ListedClient` with:

- `id`, `name`, and optional descriptive metadata
- `tools`, `prompts`, `skills`, and `resources`
- `status`, `connectedAt`, and `lastSeenAt`
- `connection.mode`, `connection.secure`, and `connection.authSource`

`connection.mode` is `ws` or `http-loop`.

## Use it first when

- you want to confirm whether a runtime is connected
- you need a quick capability summary before drilling into one kind
- you want connection metadata such as transport mode or auth source
