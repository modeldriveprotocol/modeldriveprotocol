package mdp

import (
	"encoding/json"
	"errors"
	"fmt"
)

type ClientToServerMessage map[string]any

type ServerToClientMessage interface {
	messageType() string
}

type PingMessage struct {
	Timestamp int64
}

func (message PingMessage) messageType() string { return "ping" }

type PongMessage struct {
	Timestamp int64
}

func (message PongMessage) messageType() string { return "pong" }

type CallClientMessage struct {
	RequestID string
	ClientID  string
	Method    HttpMethod
	Path      string
	Params    map[string]any
	Query     map[string]any
	Body      any
	Headers   map[string]string
	Auth      *AuthContext
}

func (message CallClientMessage) messageType() string { return "callClient" }

func BuildRegisterClientMessage(client ClientDescriptor, auth *AuthContext) ClientToServerMessage {
	payload := ClientToServerMessage{
		"type":   "registerClient",
		"client": client.ToMap(),
	}
	if auth != nil {
		payload["auth"] = auth
	}
	return payload
}

func BuildUpdateClientCatalogMessage(clientID string, paths []PathDescriptor) ClientToServerMessage {
	serializedPaths := make([]map[string]any, 0, len(paths))
	for _, path := range paths {
		serializedPaths = append(serializedPaths, path.ToMap())
	}
	return ClientToServerMessage{
		"type":     "updateClientCatalog",
		"clientId": clientID,
		"paths":    serializedPaths,
	}
}

func BuildUnregisterClientMessage(clientID string) ClientToServerMessage {
	return ClientToServerMessage{
		"type":     "unregisterClient",
		"clientId": clientID,
	}
}

func BuildCallClientResultMessage(requestID string, ok bool, data any, protocolError *SerializedError) ClientToServerMessage {
	payload := ClientToServerMessage{
		"type":      "callClientResult",
		"requestId": requestID,
		"ok":        ok,
	}
	if ok {
		payload["data"] = data
	} else if protocolError != nil {
		payload["error"] = protocolError
	}
	return payload
}

func BuildPongMessage(timestamp int64) ClientToServerMessage {
	return ClientToServerMessage{
		"type":      "pong",
		"timestamp": timestamp,
	}
}

func ParseServerToClientMessage(raw []byte) (ServerToClientMessage, error) {
	var envelope map[string]any
	if err := json.Unmarshal(raw, &envelope); err != nil {
		return nil, err
	}

	messageType, ok := envelope["type"].(string)
	if !ok {
		return nil, errors.New("missing message type")
	}

	switch messageType {
	case "ping":
		timestamp, ok := asInt64(envelope["timestamp"])
		if !ok {
			return nil, errors.New("invalid ping payload")
		}
		return PingMessage{Timestamp: timestamp}, nil
	case "pong":
		timestamp, ok := asInt64(envelope["timestamp"])
		if !ok {
			return nil, errors.New("invalid pong payload")
		}
		return PongMessage{Timestamp: timestamp}, nil
	case "callClient":
		requestID, ok := envelope["requestId"].(string)
		if !ok {
			return nil, errors.New("missing requestId")
		}
		clientID, ok := envelope["clientId"].(string)
		if !ok {
			return nil, errors.New("missing clientId")
		}
		method, ok := envelope["method"].(string)
		if !ok {
			return nil, errors.New("missing method")
		}
		path, ok := envelope["path"].(string)
		if !ok || !IsConcretePath(path) {
			return nil, errors.New("invalid path")
		}
		return CallClientMessage{
			RequestID: requestID,
			ClientID:  clientID,
			Method:    HttpMethod(method),
			Path:      path,
			Params:    asMap(envelope["params"]),
			Query:     asMap(envelope["query"]),
			Body:      envelope["body"],
			Headers:   asStringMap(envelope["headers"]),
			Auth:      asAuthContext(envelope["auth"]),
		}, nil
	default:
		return nil, fmt.Errorf("unsupported message type %q", messageType)
	}
}

func asMap(value any) map[string]any {
	if value == nil {
		return map[string]any{}
	}
	if typed, ok := value.(map[string]any); ok {
		return typed
	}
	return map[string]any{}
}

func asStringMap(value any) map[string]string {
	if value == nil {
		return map[string]string{}
	}
	typed, ok := value.(map[string]any)
	if !ok {
		return map[string]string{}
	}
	result := make(map[string]string, len(typed))
	for key, entry := range typed {
		if stringValue, ok := entry.(string); ok {
			result[key] = stringValue
		}
	}
	return result
}

func asInt64(value any) (int64, bool) {
	switch typed := value.(type) {
	case float64:
		return int64(typed), true
	case int64:
		return typed, true
	case int:
		return int64(typed), true
	default:
		return 0, false
	}
}

func asAuthContext(value any) *AuthContext {
	typed, ok := value.(map[string]any)
	if !ok {
		return nil
	}
	auth := &AuthContext{}
	if scheme, ok := typed["scheme"].(string); ok {
		auth.Scheme = scheme
	}
	if token, ok := typed["token"].(string); ok {
		auth.Token = token
	}
	auth.Headers = asStringMap(typed["headers"])
	auth.Metadata = asMap(typed["metadata"])
	return auth
}
