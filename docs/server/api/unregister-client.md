---
title: unregisterClient
status: Draft
---

# `unregisterClient`

`unregisterClient` is the client-to-server lifecycle event used to remove one logical client registration while the transport can still remain open.

| Event Type | Flow Direction |
| --- | --- |
| `unregisterClient` | Client -> Server |

## Data Definition

```ts
interface UnregisterClientMessage {
  type: "unregisterClient";
  clientId: string;
}
```

## Examples

- Remove one browser registration

```json
{
  "type": "unregisterClient",
  "clientId": "browser-01"
}
```

- Remove one IDE workspace registration

```json
{
  "type": "unregisterClient",
  "clientId": "vscode-workspace-a"
}
```
