---
title: 简易上手
status: Draft
---

# Go SDK / 简易上手

当你的 MDP client 运行在本地 daemon、CLI helper、服务进程或嵌入式运行时里时，使用 Go SDK。

## 1. 安装模块

```bash
go get github.com/modeldriveprotocol/modeldriveprotocol/sdks/go/v2
```

## 2. 创建 client

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

## 3. 暴露一个路径

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

## 4. 连接并注册

```go
  _ = client.Connect(context.Background())
  _ = client.Register(context.Background(), nil)
}
```

## 当前 transport 支持

Go SDK 当前支持：

- `ws` / `wss`
- `http` / `https` loop mode

如果你要看维护者视角的开发、调试和发布细节，继续阅读 [Go SDK 开发指南](/zh-Hans/contributing/modules/sdks/go)。
