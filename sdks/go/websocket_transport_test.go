package mdp

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"nhooyr.io/websocket"
)

func TestWebSocketCloseCallbackFiresForEachSession(t *testing.T) {
	t.Helper()

	serverConnections := make(chan *websocket.Conn, 2)
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
		}
	}))
	defer server.Close()

	transport := NewWebSocketClientTransport(strings.Replace(server.URL, "http", "ws", 1), nil)
	closeNotifications := make(chan struct{}, 2)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	for range 2 {
		if err := transport.Connect(ctx, func(ServerToClientMessage) {}, func() {
			closeNotifications <- struct{}{}
		}); err != nil {
			t.Fatal(err)
		}

		var serverConn *websocket.Conn
		select {
		case serverConn = <-serverConnections:
		case <-ctx.Done():
			t.Fatal("timed out waiting for websocket session")
		}

		if err := serverConn.Close(websocket.StatusNormalClosure, "server closing"); err != nil {
			t.Fatalf("failed to close websocket session: %v", err)
		}

		select {
		case <-closeNotifications:
		case <-ctx.Done():
			t.Fatal("timed out waiting for close notification")
		}
	}

	select {
	case <-closeNotifications:
		t.Fatal("expected exactly one close notification per session")
	default:
	}
}

func TestWebSocketLocalCloseCallbackFiresAfterReconnect(t *testing.T) {
	t.Helper()

	serverConnections := make(chan *websocket.Conn, 2)
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
			defer conn.Close(websocket.StatusNormalClosure, "server shutdown")
			_, _, _ = conn.Read(context.Background())
		}()
	}))
	defer server.Close()

	transport := NewWebSocketClientTransport(strings.Replace(server.URL, "http", "ws", 1), nil)
	closeNotifications := make(chan struct{}, 2)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	for range 2 {
		if err := transport.Connect(ctx, func(ServerToClientMessage) {}, func() {
			closeNotifications <- struct{}{}
		}); err != nil {
			t.Fatal(err)
		}

		select {
		case <-serverConnections:
		case <-ctx.Done():
			t.Fatal("timed out waiting for websocket session")
		}

		if err := transport.Close(ctx); err != nil {
			t.Fatal(err)
		}

		select {
		case <-closeNotifications:
		case <-ctx.Done():
			t.Fatal("timed out waiting for close notification")
		}
	}

	select {
	case <-closeNotifications:
		t.Fatal("expected exactly one close notification per local close")
	default:
	}
}

func TestWebSocketConnectRejectsActiveSession(t *testing.T) {
	t.Helper()

	var acceptedConnections int32
	firstConnectionReady := make(chan struct{}, 1)
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		conn, err := websocket.Accept(writer, request, nil)
		if err != nil {
			t.Errorf("failed to accept websocket connection: %v", err)
			return
		}

		if atomic.AddInt32(&acceptedConnections, 1) == 1 {
			select {
			case firstConnectionReady <- struct{}{}:
			default:
			}
		}

		go func() {
			defer conn.Close(websocket.StatusNormalClosure, "server shutdown")
			_, _, _ = conn.Read(context.Background())
		}()
	}))
	defer server.Close()

	transport := NewWebSocketClientTransport(strings.Replace(server.URL, "http", "ws", 1), nil)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	if err := transport.Connect(ctx, func(ServerToClientMessage) {}, func() {}); err != nil {
		t.Fatal(err)
	}

	select {
	case <-firstConnectionReady:
	case <-ctx.Done():
		t.Fatal("timed out waiting for websocket connection")
	}

	if err := transport.Connect(ctx, func(ServerToClientMessage) {}, func() {}); err != ErrAlreadyConnected {
		t.Fatalf("expected ErrAlreadyConnected, got %v", err)
	}

	if got := atomic.LoadInt32(&acceptedConnections); got != 1 {
		t.Fatalf("expected a single accepted websocket connection, got %d", got)
	}

	if err := transport.Close(ctx); err != nil {
		t.Fatal(err)
	}
}
