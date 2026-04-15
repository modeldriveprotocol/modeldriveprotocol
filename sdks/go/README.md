# `modeldriveprotocol-go`

Go client SDK for Model Drive Protocol.

## Install

```bash
go get github.com/modeldriveprotocol/modeldriveprotocol/sdks/go/v2
```

## Quick start

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

  client.ExposeEndpoint(
    "/page/search",
    mdp.HttpMethodPost,
    func(request mdp.PathRequest, context mdp.PathInvocationContext) (any, error) {
      return map[string]any{"matches": 0}, nil
    },
    mdp.EndpointOptions{Description: "Search the current runtime"},
  )

  _ = client.Connect(context.Background())
  _ = client.Register(context.Background(), nil)
}
```

This SDK currently supports websocket and HTTP loop transports.

Go modules are published from the repository with prefixed tags such as `sdks/go/v2.2.0`.
