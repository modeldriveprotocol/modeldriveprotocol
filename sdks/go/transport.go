package mdp

import (
	"context"
	"errors"
	"net/url"
)

type MessageHandler func(ServerToClientMessage)
type CloseHandler func()

type ClientTransport interface {
	Connect(context.Context, MessageHandler, CloseHandler) error
	Send(context.Context, ClientToServerMessage) error
	Close(context.Context) error
}

func CreateDefaultTransport(serverURL string) (ClientTransport, error) {
	parsedURL, err := url.Parse(serverURL)
	if err != nil {
		return nil, err
	}

	switch parsedURL.Scheme {
	case "ws", "wss":
		return NewWebSocketClientTransport(serverURL, nil), nil
	case "http", "https":
		return NewHTTPLoopClientTransport(serverURL, nil), nil
	default:
		return nil, errors.New("unsupported MDP transport protocol")
	}
}
