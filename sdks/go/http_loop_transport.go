package mdp

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"path"
	"strings"
	"sync"
)

const defaultHTTPLoopPath = "/mdp/http-loop"
const sessionHeader = "x-mdp-session-id"

type HTTPLoopClientTransport struct {
	serverURL    string
	endpointPath string
	headers      map[string]string
	client       *http.Client
	mu           sync.RWMutex
	session      *httpLoopSession
}

type transportCloseSignal struct {
	onClose CloseHandler
	once    sync.Once
}

type httpLoopSession struct {
	id          string
	closeSignal *transportCloseSignal
	pollCtx     context.Context
	cancelPoll  context.CancelFunc
}

func NewHTTPLoopClientTransport(serverURL string, headers map[string]string) *HTTPLoopClientTransport {
	return &HTTPLoopClientTransport{
		serverURL:    serverURL,
		endpointPath: defaultHTTPLoopPath,
		headers:      cloneStringMap(headers),
		client:       &http.Client{},
	}
}

func (transport *HTTPLoopClientTransport) Connect(
	ctx context.Context,
	onMessage MessageHandler,
	onClose CloseHandler,
) error {
	transport.mu.Lock()
	if transport.session != nil {
		transport.mu.Unlock()
		return ErrAlreadyConnected
	}

	response, err := transport.doJSONRequest(ctx, http.MethodPost, transport.endpointURL("/connect"), map[string]string{}, map[string]any{})
	if err != nil {
		transport.mu.Unlock()
		return err
	}

	var payload struct {
		SessionID string `json:"sessionId"`
	}
	if err := json.Unmarshal(response, &payload); err != nil {
		transport.mu.Unlock()
		return err
	}

	pollCtx, cancelPoll := context.WithCancel(context.Background())
	session := &httpLoopSession{
		id:          payload.SessionID,
		closeSignal: &transportCloseSignal{onClose: onClose},
		pollCtx:     pollCtx,
		cancelPoll:  cancelPoll,
	}

	transport.session = session
	transport.mu.Unlock()

	go func(session *httpLoopSession) {
		defer transport.handleSessionExit(session)

		for {
			pollURL, _ := url.Parse(transport.endpointURL("/poll"))
			query := pollURL.Query()
			query.Set("sessionId", session.id)
			query.Set("waitMs", "25000")
			pollURL.RawQuery = query.Encode()

			body, status, err := transport.doRequest(session.pollCtx, http.MethodGet, pollURL.String(), map[string]string{})
			if err != nil {
				return
			}
			if status == http.StatusNoContent {
				continue
			}

			var envelope struct {
				Message json.RawMessage `json:"message"`
			}
			if err := json.Unmarshal(body, &envelope); err != nil || len(envelope.Message) == 0 {
				continue
			}

			message, err := ParseServerToClientMessage(envelope.Message)
			if err != nil {
				continue
			}
			onMessage(message)
		}
	}(session)

	return nil
}

func (transport *HTTPLoopClientTransport) Send(ctx context.Context, message ClientToServerMessage) error {
	session := transport.currentSession()
	if session == nil {
		return ErrNotConnected
	}

	_, err := transport.doJSONRequest(
		ctx,
		http.MethodPost,
		transport.endpointURL("/send"),
		map[string]string{sessionHeader: session.id},
		map[string]any{"message": message},
	)
	return err
}

func (transport *HTTPLoopClientTransport) Close(ctx context.Context) error {
	session := transport.detachSession()
	if session == nil {
		return nil
	}

	session.cancelPoll()
	if session.id == "" {
		session.closeSignal.emit()
		return nil
	}

	_, err := transport.doJSONRequest(
		ctx,
		http.MethodPost,
		transport.endpointURL("/disconnect"),
		map[string]string{sessionHeader: session.id},
		map[string]any{},
	)
	session.closeSignal.emit()
	return err
}

func (transport *HTTPLoopClientTransport) endpointURL(suffix string) string {
	baseURL := transport.serverURL
	if !strings.HasSuffix(baseURL, "/") {
		baseURL += "/"
	}

	parsedBaseURL, err := url.Parse(baseURL)
	if err != nil {
		return transport.serverURL + transport.endpointPath + suffix
	}

	relativePath := path.Join(
		strings.TrimPrefix(transport.endpointPath, "/"),
		strings.TrimPrefix(suffix, "/"),
	)
	return parsedBaseURL.ResolveReference(&url.URL{Path: relativePath}).String()
}

func (transport *HTTPLoopClientTransport) doJSONRequest(
	ctx context.Context,
	method string,
	requestURL string,
	extraHeaders map[string]string,
	payload any,
) ([]byte, error) {
	body, status, err := transport.doRequest(ctx, method, requestURL, extraHeaders, payload)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, ErrTransport
	}
	return body, nil
}

func (transport *HTTPLoopClientTransport) doRequest(
	ctx context.Context,
	method string,
	requestURL string,
	extraHeaders map[string]string,
	payload ...any,
) ([]byte, int, error) {
	var requestBody io.Reader
	if len(payload) > 0 {
		requestPayload, err := json.Marshal(payload[0])
		if err != nil {
			return nil, 0, err
		}
		requestBody = bytes.NewReader(requestPayload)
	}

	request, err := http.NewRequestWithContext(ctx, method, requestURL, requestBody)
	if err != nil {
		return nil, 0, err
	}
	if len(payload) > 0 {
		request.Header.Set("content-type", "application/json")
	}
	for key, value := range transport.headers {
		request.Header.Set(key, value)
	}
	for key, value := range extraHeaders {
		request.Header.Set(key, value)
	}

	response, err := transport.client.Do(request)
	if err != nil {
		return nil, 0, err
	}
	defer response.Body.Close()

	body, err := ioReadAll(response.Body)
	if err != nil {
		return nil, 0, err
	}
	return body, response.StatusCode, nil
}

func (transport *HTTPLoopClientTransport) currentSession() *httpLoopSession {
	transport.mu.RLock()
	defer transport.mu.RUnlock()
	return transport.session
}

func (transport *HTTPLoopClientTransport) detachSession() *httpLoopSession {
	transport.mu.Lock()
	defer transport.mu.Unlock()

	session := transport.session
	transport.session = nil
	return session
}

func (transport *HTTPLoopClientTransport) handleSessionExit(session *httpLoopSession) {
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

func (closeSignal *transportCloseSignal) emit() {
	if closeSignal == nil {
		return
	}
	closeSignal.once.Do(func() {
		if closeSignal.onClose != nil {
			closeSignal.onClose()
		}
	})
}
