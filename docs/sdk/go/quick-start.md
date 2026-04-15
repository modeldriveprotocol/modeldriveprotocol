---
title: Quick Start
status: Draft
---

# Go Quick Start

Use the Go SDK when your MDP client lives in a local daemon, CLI helper, service process, or embedded runtime.

## 1. Install the module

```bash
go get github.com/modeldriveprotocol/modeldriveprotocol/sdks/go/v2
```

## 2. Create a client

```go
package main

import (
  "context"

  mdp "github.com/modeldriveprotocol/modeldriveprotocol/sdks/go/v2"
)

func main() {
  client, _ := mdp.NewClient(
    "ws://127.0.0.1:47372",
    mdp.ClientInfo{ID: "go-01", Name: "Go Client"},
  )
```

## 3. Expose one path

```go
  client.ExposeEndpoint(
    "/page/search",
    mdp.HttpMethodPost,
    func(request mdp.PathRequest, _ mdp.PathInvocationContext) (any, error) {
      return map[string]any{"matches": 0}, nil
    },
    mdp.EndpointOptions{Description: "Search the current runtime."},
  )
```

## 4. Connect and register

```go
  _ = client.Connect(context.Background())
  _ = client.Register(context.Background(), nil)
}
```

## Transport support

The Go SDK currently supports:

- `ws` / `wss`
- `http` / `https` loop mode

For contributor workflow, debugging notes, and release details, continue with [Go SDK Guide](/contributing/modules/sdks/go).
