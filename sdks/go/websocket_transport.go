package mdp

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"

	"nhooyr.io/websocket"
)

type WebSocketClientTransport struct {
	serverURL string
	headers   map[string]string
	mu        sync.RWMutex
	session   *webSocketSession
}

type webSocketSession struct {
	conn        *websocket.Conn
	closeSignal *transportCloseSignal
}

func NewWebSocketClientTransport(serverURL string, headers map[string]string) *WebSocketClientTransport {
	return &WebSocketClientTransport{
		serverURL: serverURL,
		headers:   cloneStringMap(headers),
	}
}

func (transport *WebSocketClientTransport) Connect(
	ctx context.Context,
	onMessage MessageHandler,
	onClose CloseHandler,
) error {
	transport.mu.Lock()
	if transport.session != nil {
		transport.mu.Unlock()
		return ErrAlreadyConnected
	}

	requestHeader := http.Header{}
	for key, value := range transport.headers {
		requestHeader.Set(key, value)
	}
	conn, _, err := websocket.Dial(ctx, transport.serverURL, &websocket.DialOptions{
		HTTPHeader: requestHeader,
	})
	if err != nil {
		transport.mu.Unlock()
		return err
	}

	session := &webSocketSession{
		conn:        conn,
		closeSignal: &transportCloseSignal{onClose: onClose},
	}
	transport.session = session
	transport.mu.Unlock()

	go func(session *webSocketSession) {
		defer transport.handleSessionExit(session)
		for {
			_, payload, err := session.conn.Read(context.Background())
			if err != nil {
				return
			}
			message, err := ParseServerToClientMessage(payload)
			if err != nil {
				continue
			}
			onMessage(message)
		}
	}(session)

	return nil
}

func (transport *WebSocketClientTransport) Send(ctx context.Context, message ClientToServerMessage) error {
	session := transport.currentSession()
	if session == nil {
		return ErrNotConnected
	}
	payload, err := json.Marshal(message)
	if err != nil {
		return err
	}
	return session.conn.Write(ctx, websocket.MessageText, payload)
}

func (transport *WebSocketClientTransport) Close(ctx context.Context) error {
	session := transport.detachSession()
	if session == nil {
		return nil
	}

	err := session.conn.Close(websocket.StatusNormalClosure, "closing")
	session.closeSignal.emit()
	return err
}

func (transport *WebSocketClientTransport) currentSession() *webSocketSession {
	transport.mu.RLock()
	defer transport.mu.RUnlock()
	return transport.session
}

func (transport *WebSocketClientTransport) detachSession() *webSocketSession {
	transport.mu.Lock()
	defer transport.mu.Unlock()

	session := transport.session
	transport.session = nil
	return session
}

func (transport *WebSocketClientTransport) handleSessionExit(session *webSocketSession) {
	if session == nil {
		return
	}

	shouldNotify := false
	transport.mu.Lock()
	if transport.session == session {
		transport.session = nil
		shouldNotify = true
	}
	transport.mu.Unlock()

	if shouldNotify {
		session.closeSignal.emit()
	}
}
