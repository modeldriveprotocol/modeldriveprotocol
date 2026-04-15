package mdp

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestHTTPLoopDoRequestDoesNotSendBodyForGetWithoutPayload(t *testing.T) {
	t.Helper()

	var gotContentType string
	var gotBody []byte
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		gotContentType = request.Header.Get("content-type")
		body, err := io.ReadAll(request.Body)
		if err != nil {
			t.Fatalf("failed to read request body: %v", err)
		}
		gotBody = body
		writer.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	transport := NewHTTPLoopClientTransport(server.URL, nil)
	if _, status, err := transport.doRequest(context.Background(), http.MethodGet, server.URL, map[string]string{}); err != nil {
		t.Fatal(err)
	} else if status != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d", http.StatusNoContent, status)
	}

	if len(gotBody) != 0 {
		t.Fatalf("expected GET request body to be empty, got %q", string(gotBody))
	}
	if gotContentType != "" {
		t.Fatalf("expected GET request to omit content-type, got %q", gotContentType)
	}
}

func TestHTTPLoopEndpointURLNormalizesBaseURL(t *testing.T) {
	testCases := []struct {
		name      string
		serverURL string
		expected  string
	}{
		{
			name:      "host root with trailing slash",
			serverURL: "https://example.com/",
			expected:  "https://example.com/mdp/http-loop/connect",
		},
		{
			name:      "base path with trailing slash",
			serverURL: "https://example.com/base/",
			expected:  "https://example.com/base/mdp/http-loop/connect",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			transport := NewHTTPLoopClientTransport(testCase.serverURL, nil)
			got := transport.endpointURL("/connect")
			if got != testCase.expected {
				t.Fatalf("expected %q, got %q", testCase.expected, got)
			}
		})
	}
}

func TestHTTPLoopCloseCallbackFiresForEachSession(t *testing.T) {
	t.Helper()

	sessionNumber := 0
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch request.URL.Path {
		case "/mdp/http-loop/connect":
			sessionNumber += 1
			writer.Header().Set("content-type", "application/json")
			_, _ = fmt.Fprintf(writer, `{"sessionId":"session-%d"}`, sessionNumber)
		case "/mdp/http-loop/poll":
			writer.WriteHeader(http.StatusNoContent)
		case "/mdp/http-loop/disconnect":
			writer.Header().Set("content-type", "application/json")
			_, _ = writer.Write([]byte(`{}`))
		default:
			http.NotFound(writer, request)
		}
	}))
	defer server.Close()

	transport := NewHTTPLoopClientTransport(server.URL, nil)
	closeNotifications := make(chan struct{}, 2)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	for range 2 {
		if err := transport.Connect(ctx, func(ServerToClientMessage) {}, func() {
			closeNotifications <- struct{}{}
		}); err != nil {
			t.Fatal(err)
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
		t.Fatal("expected exactly one close notification per session")
	default:
	}
}

func TestHTTPLoopReconnectDoesNotReusePreviousPoller(t *testing.T) {
	t.Helper()

	var sessionNumber int
	var sessionNumberMu sync.Mutex
	var session2ActivePolls int32
	var session2MaxActivePolls int32

	firstPollStarted := make(chan struct{}, 1)
	secondPollStarted := make(chan struct{}, 1)
	releaseSecondPoll := make(chan struct{})

	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch request.URL.Path {
		case "/mdp/http-loop/connect":
			sessionNumberMu.Lock()
			sessionNumber += 1
			currentSessionNumber := sessionNumber
			sessionNumberMu.Unlock()

			writer.Header().Set("content-type", "application/json")
			_, _ = fmt.Fprintf(writer, `{"sessionId":"session-%d"}`, currentSessionNumber)
		case "/mdp/http-loop/poll":
			switch request.URL.Query().Get("sessionId") {
			case "session-1":
				select {
				case firstPollStarted <- struct{}{}:
				default:
				}
				<-request.Context().Done()
			case "session-2":
				activePolls := atomic.AddInt32(&session2ActivePolls, 1)
				defer atomic.AddInt32(&session2ActivePolls, -1)

				for {
					currentMax := atomic.LoadInt32(&session2MaxActivePolls)
					if activePolls <= currentMax || atomic.CompareAndSwapInt32(&session2MaxActivePolls, currentMax, activePolls) {
						break
					}
				}

				select {
				case secondPollStarted <- struct{}{}:
				default:
				}

				select {
				case <-releaseSecondPoll:
					writer.WriteHeader(http.StatusNoContent)
				case <-request.Context().Done():
				}
			default:
				http.NotFound(writer, request)
			}
		case "/mdp/http-loop/disconnect":
			writer.Header().Set("content-type", "application/json")
			_, _ = writer.Write([]byte(`{}`))
		default:
			http.NotFound(writer, request)
		}
	}))
	defer server.Close()

	transport := NewHTTPLoopClientTransport(server.URL, nil)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := transport.Connect(ctx, func(ServerToClientMessage) {}, func() {}); err != nil {
		t.Fatal(err)
	}

	select {
	case <-firstPollStarted:
	case <-ctx.Done():
		t.Fatal("timed out waiting for first poll to start")
	}

	if err := transport.Close(ctx); err != nil {
		t.Fatal(err)
	}
	if err := transport.Connect(ctx, func(ServerToClientMessage) {}, func() {}); err != nil {
		t.Fatal(err)
	}

	select {
	case <-secondPollStarted:
	case <-ctx.Done():
		t.Fatal("timed out waiting for second poll to start")
	}

	time.Sleep(100 * time.Millisecond)
	close(releaseSecondPoll)

	if err := transport.Close(ctx); err != nil {
		t.Fatal(err)
	}

	if maxActivePolls := atomic.LoadInt32(&session2MaxActivePolls); maxActivePolls != 1 {
		t.Fatalf("expected exactly one concurrent poller for the new session, got %d", maxActivePolls)
	}
}

func TestHTTPLoopConnectRejectsActiveSession(t *testing.T) {
	t.Helper()

	var connectRequests int32
	pollStarted := make(chan struct{}, 1)

	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch request.URL.Path {
		case "/mdp/http-loop/connect":
			connectNumber := atomic.AddInt32(&connectRequests, 1)
			writer.Header().Set("content-type", "application/json")
			_, _ = fmt.Fprintf(writer, `{"sessionId":"session-%d"}`, connectNumber)
		case "/mdp/http-loop/poll":
			select {
			case pollStarted <- struct{}{}:
			default:
			}
			<-request.Context().Done()
		case "/mdp/http-loop/disconnect":
			writer.Header().Set("content-type", "application/json")
			_, _ = writer.Write([]byte(`{}`))
		default:
			http.NotFound(writer, request)
		}
	}))
	defer server.Close()

	transport := NewHTTPLoopClientTransport(server.URL, nil)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	if err := transport.Connect(ctx, func(ServerToClientMessage) {}, func() {}); err != nil {
		t.Fatal(err)
	}

	select {
	case <-pollStarted:
	case <-ctx.Done():
		t.Fatal("timed out waiting for initial poll to start")
	}

	if err := transport.Connect(ctx, func(ServerToClientMessage) {}, func() {}); err != ErrAlreadyConnected {
		t.Fatalf("expected ErrAlreadyConnected, got %v", err)
	}

	if got := atomic.LoadInt32(&connectRequests); got != 1 {
		t.Fatalf("expected a single connect request, got %d", got)
	}

	if err := transport.Close(ctx); err != nil {
		t.Fatal(err)
	}
}
