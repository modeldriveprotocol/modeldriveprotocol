package mdp

import (
	"context"
	"errors"
	"net/url"
	"sync"
)

var (
	ErrAlreadyConnected = errors.New("MDP connection is already active")
	ErrNotConnected     = errors.New("MDP client is not connected")
	ErrNotRegistered    = errors.New("MDP client is not registered")
	ErrTransport        = errors.New("transport error")
)

type Client struct {
	serverURL  string
	mu         sync.RWMutex
	clientInfo ClientInfo
	auth       *AuthContext
	registry   *ProcedureRegistry
	transport  ClientTransport
	connected  bool
	registered bool
}

func NewClient(serverURL string, clientInfo ClientInfo) (*Client, error) {
	_, err := url.Parse(serverURL)
	if err != nil {
		return nil, err
	}

	transport, err := CreateDefaultTransport(serverURL)
	if err != nil {
		return nil, err
	}

	return NewClientWithTransport(serverURL, clientInfo, transport), nil
}

func NewClientWithTransport(serverURL string, clientInfo ClientInfo, transport ClientTransport) *Client {
	return &Client{
		serverURL:  serverURL,
		clientInfo: clientInfo,
		registry:   NewProcedureRegistry(),
		transport:  transport,
	}
}

func (client *Client) SetAuth(auth *AuthContext) {
	client.mu.Lock()
	defer client.mu.Unlock()
	client.auth = auth
}

func (client *Client) ExposeEndpoint(path string, method HttpMethod, handler PathHandler, options EndpointOptions) error {
	return client.registry.ExposeEndpoint(path, method, handler, options)
}

func (client *Client) ExposeSkillMarkdown(path string, content string, options SkillOptions) error {
	return client.registry.ExposeSkillMarkdown(path, content, options)
}

func (client *Client) ExposePromptMarkdown(path string, content string, options PromptOptions) error {
	return client.registry.ExposePromptMarkdown(path, content, options)
}

func (client *Client) Unexpose(path string, method *HttpMethod) (bool, error) {
	return client.registry.Unexpose(path, method)
}

func (client *Client) Describe() ClientDescriptor {
	client.mu.RLock()
	info := client.clientInfo
	client.mu.RUnlock()
	return client.registry.Describe(info)
}

func (client *Client) Connect(ctx context.Context) error {
	if err := client.transport.Connect(ctx, client.handleMessage, client.handleTransportClose); err != nil {
		return err
	}
	client.mu.Lock()
	client.connected = true
	client.mu.Unlock()
	return nil
}

func (client *Client) Register(ctx context.Context, override *ClientInfoOverride) error {
	client.mu.Lock()
	if !client.connected {
		client.mu.Unlock()
		return ErrNotConnected
	}
	client.clientInfo = client.clientInfo.ApplyOverride(override)
	auth := client.auth
	client.mu.Unlock()

	if err := client.transport.Send(ctx, BuildRegisterClientMessage(client.Describe(), auth)); err != nil {
		return err
	}

	client.mu.Lock()
	client.registered = true
	client.mu.Unlock()
	return nil
}

func (client *Client) SyncCatalog(ctx context.Context) error {
	client.mu.RLock()
	connected := client.connected
	registered := client.registered
	clientID := client.clientInfo.ID
	client.mu.RUnlock()

	if !connected {
		return ErrNotConnected
	}
	if !registered {
		return ErrNotRegistered
	}

	return client.transport.Send(ctx, BuildUpdateClientCatalogMessage(clientID, client.registry.DescribePaths()))
}

func (client *Client) Disconnect(ctx context.Context) error {
	client.mu.RLock()
	connected := client.connected
	registered := client.registered
	clientID := client.clientInfo.ID
	client.mu.RUnlock()

	if connected && registered {
		_ = client.transport.Send(ctx, BuildUnregisterClientMessage(clientID))
	}
	err := client.transport.Close(ctx)
	client.mu.Lock()
	client.connected = false
	client.registered = false
	client.mu.Unlock()
	return err
}

func (client *Client) handleMessage(message ServerToClientMessage) {
	switch typed := message.(type) {
	case PingMessage:
		_ = client.transport.Send(context.Background(), BuildPongMessage(typed.Timestamp))
	case CallClientMessage:
		data, err := client.registry.Invoke(typed)
		if err != nil {
			protocolError := NewHandlerError(err.Error())
			_ = client.transport.Send(
				context.Background(),
				BuildCallClientResultMessage(typed.RequestID, false, nil, &protocolError),
			)
			return
		}
		_ = client.transport.Send(
			context.Background(),
			BuildCallClientResultMessage(typed.RequestID, true, data, nil),
		)
	}
}

func (client *Client) handleTransportClose() {
	client.mu.Lock()
	defer client.mu.Unlock()
	client.connected = false
	client.registered = false
}
