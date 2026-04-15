package mdp

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"nhooyr.io/websocket"
)

type fakeTransport struct {
	onMessage MessageHandler
	onClose   CloseHandler
	sent      []ClientToServerMessage
	connected bool
}

func (transport *fakeTransport) Connect(_ context.Context, onMessage MessageHandler, onClose CloseHandler) error {
	transport.onMessage = onMessage
	transport.onClose = onClose
	transport.connected = true
	return nil
}

func (transport *fakeTransport) Send(_ context.Context, message ClientToServerMessage) error {
	transport.sent = append(transport.sent, message)
	return nil
}

func (transport *fakeTransport) Close(_ context.Context) error {
	transport.connected = false
	if transport.onClose != nil {
		transport.onClose()
	}
	return nil
}

func (transport *fakeTransport) emit(message ServerToClientMessage) {
	if transport.onMessage != nil {
		transport.onMessage(message)
	}
}

func TestRegisterRequiresConnection(t *testing.T) {
	transport := &fakeTransport{}
	client := NewClientWithTransport("ws://127.0.0.1:7070", ClientInfo{ID: "go-01", Name: "Go Client"}, transport)

	if err := client.Register(context.Background(), nil); err != ErrNotConnected {
		t.Fatalf("expected ErrNotConnected, got %v", err)
	}
}

func TestRegistersPathsAfterConnect(t *testing.T) {
	transport := &fakeTransport{}
	client := NewClientWithTransport("ws://127.0.0.1:7070", ClientInfo{ID: "go-01", Name: "Go Client"}, transport)
	client.SetAuth(&AuthContext{Scheme: "Bearer", Token: "client-token"})
	if err := client.ExposeEndpoint(
		"/goods",
		HttpMethodGet,
		func(_ PathRequest, _ PathInvocationContext) (any, error) {
			return map[string]any{"list": []any{}, "total": 0}, nil
		},
		EndpointOptions{Description: "List goods"},
	); err != nil {
		t.Fatal(err)
	}

	if err := client.Connect(context.Background()); err != nil {
		t.Fatal(err)
	}

	description := "Test go client"
	if err := client.Register(context.Background(), &ClientInfoOverride{Description: &description}); err != nil {
		t.Fatal(err)
	}

	if !transport.connected {
		t.Fatal("expected transport to be connected")
	}
	if len(transport.sent) != 1 {
		t.Fatalf("expected 1 sent message, got %d", len(transport.sent))
	}
	if transport.sent[0]["type"] != "registerClient" {
		t.Fatalf("expected registerClient, got %#v", transport.sent[0])
	}
}

func TestHandlesPingAndInvocationMessages(t *testing.T) {
	transport := &fakeTransport{}
	client := NewClientWithTransport("ws://127.0.0.1:7070", ClientInfo{ID: "go-01", Name: "Go Client"}, transport)
	if err := client.ExposeEndpoint(
		"/goods/:id",
		HttpMethodGet,
		func(request PathRequest, context PathInvocationContext) (any, error) {
			return map[string]any{
				"id":        request.Params["id"],
				"page":      request.Queries["page"],
				"authToken": context.Auth.Token,
			}, nil
		},
		EndpointOptions{},
	); err != nil {
		t.Fatal(err)
	}

	if err := client.Connect(context.Background()); err != nil {
		t.Fatal(err)
	}

	transport.emit(PingMessage{Timestamp: 123})
	transport.emit(CallClientMessage{
		RequestID: "req-01",
		ClientID:  "go-01",
		Method:    HttpMethodGet,
		Path:      "/goods/sku-01",
		Query:     map[string]any{"page": float64(2)},
		Auth:      &AuthContext{Token: "host-token"},
	})

	if len(transport.sent) != 2 {
		t.Fatalf("expected 2 sent messages, got %d", len(transport.sent))
	}
	if transport.sent[0]["type"] != "pong" {
		t.Fatalf("expected pong, got %#v", transport.sent[0])
	}
	if transport.sent[1]["type"] != "callClientResult" {
		t.Fatalf("expected callClientResult, got %#v", transport.sent[1])
	}
}

func TestClientReconnectsAfterWebSocketRemoteClose(t *testing.T) {
	t.Helper()

	serverConnections := make(chan *websocket.Conn, 2)
	serverMessages := make(chan map[string]any, 1)
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		conn, err := websocket.Accept(writer, request, nil)
		if err != nil {
			t.Errorf("failed to accept websocket connection: %v", err)
			return
		}

		select {
		case serverConnections <- conn:
		default:
			_ = conn.Close(websocket.StatusPolicyViolation, "unexpected connection")
			return
		}

		go func() {
			for {
				_, payload, err := conn.Read(context.Background())
				if err != nil {
					return
				}

				var message map[string]any
				if err := json.Unmarshal(payload, &message); err != nil {
					t.Errorf("failed to decode client message: %v", err)
					return
				}

				select {
				case serverMessages <- message:
				default:
				}
			}
		}()
	}))
	defer server.Close()

	serverURL := strings.Replace(server.URL, "http", "ws", 1)
	transport := NewWebSocketClientTransport(serverURL, nil)
	client := NewClientWithTransport(serverURL, ClientInfo{ID: "go-01", Name: "Go Client"}, transport)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := client.Connect(ctx); err != nil {
		t.Fatal(err)
	}

	var firstConn *websocket.Conn
	select {
	case firstConn = <-serverConnections:
	case <-ctx.Done():
		t.Fatal("timed out waiting for initial websocket session")
	}

	if err := firstConn.Close(websocket.StatusNormalClosure, "server closing"); err != nil {
		t.Fatalf("failed to close first websocket session: %v", err)
	}

	deadline := time.Now().Add(time.Second)
	for {
		client.mu.RLock()
		connected := client.connected
		client.mu.RUnlock()

		if !connected && transport.currentSession() == nil {
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("timed out waiting for client to observe remote close")
		}
		time.Sleep(10 * time.Millisecond)
	}

	if err := client.Connect(ctx); err != nil {
		t.Fatal(err)
	}

	var secondConn *websocket.Conn
	select {
	case secondConn = <-serverConnections:
	case <-ctx.Done():
		t.Fatal("timed out waiting for reconnected websocket session")
	}

	if err := secondConn.Write(ctx, websocket.MessageText, []byte(`{"type":"ping","timestamp":456}`)); err != nil {
		t.Fatalf("failed to send ping to client: %v", err)
	}

	select {
	case message := <-serverMessages:
		if got := message["type"]; got != "pong" {
			t.Fatalf("expected pong, got %#v", message)
		}
		if timestamp, ok := asInt64(message["timestamp"]); !ok || timestamp != 456 {
			t.Fatalf("expected pong timestamp 456, got %#v", message["timestamp"])
		}
	case <-ctx.Done():
		t.Fatal("timed out waiting for client pong after reconnect")
	}

	if err := client.Disconnect(ctx); err != nil {
		t.Fatal(err)
	}
}

func TestClientReregistersAndSyncsCatalogAfterWebSocketReconnect(t *testing.T) {
	t.Helper()

	serverConnections := make(chan *websocket.Conn, 2)
	serverMessages := make(chan map[string]any, 4)
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		conn, err := websocket.Accept(writer, request, nil)
		if err != nil {
			t.Errorf("failed to accept websocket connection: %v", err)
			return
		}

		select {
		case serverConnections <- conn:
		default:
			_ = conn.Close(websocket.StatusPolicyViolation, "unexpected connection")
			return
		}

		go func() {
			for {
				_, payload, err := conn.Read(context.Background())
				if err != nil {
					return
				}

				var message map[string]any
				if err := json.Unmarshal(payload, &message); err != nil {
					t.Errorf("failed to decode client message: %v", err)
					return
				}

				select {
				case serverMessages <- message:
				default:
					t.Errorf("server message buffer exhausted")
					return
				}
			}
		}()
	}))
	defer server.Close()

	serverURL := strings.Replace(server.URL, "http", "ws", 1)
	transport := NewWebSocketClientTransport(serverURL, nil)
	client := NewClientWithTransport(serverURL, ClientInfo{ID: "go-01", Name: "Go Client"}, transport)
	if err := client.ExposeEndpoint(
		"/goods",
		HttpMethodGet,
		func(_ PathRequest, _ PathInvocationContext) (any, error) {
			return map[string]any{"items": []any{}}, nil
		},
		EndpointOptions{Description: "List goods"},
	); err != nil {
		t.Fatal(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	awaitServerMessage := func(label string) map[string]any {
		t.Helper()
		select {
		case message := <-serverMessages:
			return message
		case <-ctx.Done():
			t.Fatalf("timed out waiting for %s", label)
			return nil
		}
	}

	assertCatalogPayload := func(message map[string]any, messageType string) {
		t.Helper()

		if got := message["type"]; got != messageType {
			t.Fatalf("expected %s message, got %#v", messageType, message)
		}

		var pathsValue any
		if messageType == "registerClient" {
			clientPayload, ok := message["client"].(map[string]any)
			if !ok {
				t.Fatalf("expected registerClient payload, got %#v", message)
			}
			if got := clientPayload["id"]; got != "go-01" {
				t.Fatalf("expected client id go-01, got %#v", got)
			}
			pathsValue = clientPayload["paths"]
		} else {
			if got := message["clientId"]; got != "go-01" {
				t.Fatalf("expected clientId go-01, got %#v", got)
			}
			pathsValue = message["paths"]
		}

		paths, ok := pathsValue.([]any)
		if !ok || len(paths) != 1 {
			t.Fatalf("expected one catalog path, got %#v", pathsValue)
		}

		pathPayload, ok := paths[0].(map[string]any)
		if !ok {
			t.Fatalf("expected path payload map, got %#v", paths[0])
		}
		if got := pathPayload["path"]; got != "/goods" {
			t.Fatalf("expected path /goods, got %#v", got)
		}
		if got := pathPayload["method"]; got != string(HttpMethodGet) {
			t.Fatalf("expected method %s, got %#v", HttpMethodGet, got)
		}
	}

	waitForTransportClose := func() {
		t.Helper()
		deadline := time.Now().Add(time.Second)
		for {
			client.mu.RLock()
			connected := client.connected
			registered := client.registered
			client.mu.RUnlock()

			if !connected && !registered && transport.currentSession() == nil {
				return
			}
			if time.Now().After(deadline) {
				t.Fatal("timed out waiting for client to observe websocket close")
			}
			time.Sleep(10 * time.Millisecond)
		}
	}

	if err := client.Connect(ctx); err != nil {
		t.Fatal(err)
	}

	var firstConn *websocket.Conn
	select {
	case firstConn = <-serverConnections:
	case <-ctx.Done():
		t.Fatal("timed out waiting for initial websocket session")
	}

	if err := client.Register(ctx, nil); err != nil {
		t.Fatal(err)
	}
	assertCatalogPayload(awaitServerMessage("initial registerClient"), "registerClient")

	if err := firstConn.Close(websocket.StatusNormalClosure, "server closing"); err != nil {
		t.Fatalf("failed to close first websocket session: %v", err)
	}
	waitForTransportClose()

	if err := client.Connect(ctx); err != nil {
		t.Fatal(err)
	}

	select {
	case <-serverConnections:
	case <-ctx.Done():
		t.Fatal("timed out waiting for reconnected websocket session")
	}

	if err := client.Register(ctx, nil); err != nil {
		t.Fatal(err)
	}
	assertCatalogPayload(awaitServerMessage("reconnect registerClient"), "registerClient")

	if err := client.SyncCatalog(ctx); err != nil {
		t.Fatal(err)
	}
	assertCatalogPayload(awaitServerMessage("updateClientCatalog"), "updateClientCatalog")

	if err := client.Disconnect(ctx); err != nil {
		t.Fatal(err)
	}
}
