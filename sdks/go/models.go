package mdp

type HttpMethod string

const (
	HttpMethodGet    HttpMethod = "GET"
	HttpMethodPost   HttpMethod = "POST"
	HttpMethodPut    HttpMethod = "PUT"
	HttpMethodPatch  HttpMethod = "PATCH"
	HttpMethodDelete HttpMethod = "DELETE"
)

type AuthContext struct {
	Scheme   string            `json:"scheme,omitempty"`
	Token    string            `json:"token,omitempty"`
	Headers  map[string]string `json:"headers,omitempty"`
	Metadata map[string]any    `json:"metadata,omitempty"`
}

type ClientInfo struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	Version     string         `json:"version,omitempty"`
	Platform    string         `json:"platform,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}

func (info ClientInfo) ApplyOverride(override *ClientInfoOverride) ClientInfo {
	if override == nil {
		return info
	}

	result := info
	if override.ID != nil {
		result.ID = *override.ID
	}
	if override.Name != nil {
		result.Name = *override.Name
	}
	if override.Description != nil {
		result.Description = *override.Description
	}
	if override.Version != nil {
		result.Version = *override.Version
	}
	if override.Platform != nil {
		result.Platform = *override.Platform
	}
	if override.Metadata != nil {
		result.Metadata = override.Metadata
	}
	return result
}

type ClientInfoOverride struct {
	ID          *string
	Name        *string
	Description *string
	Version     *string
	Platform    *string
	Metadata    map[string]any
}

type PathDescriptor interface {
	Path() string
	DescriptorType() string
	ToMap() map[string]any
}

type EndpointPathDescriptor struct {
	PathValue    string
	Method       HttpMethod
	Description  string
	InputSchema  map[string]any
	OutputSchema map[string]any
	ContentType  string
}

func (descriptor EndpointPathDescriptor) Path() string {
	return descriptor.PathValue
}

func (descriptor EndpointPathDescriptor) DescriptorType() string {
	return "endpoint"
}

func (descriptor EndpointPathDescriptor) ToMap() map[string]any {
	payload := map[string]any{
		"type":   "endpoint",
		"path":   descriptor.PathValue,
		"method": descriptor.Method,
	}
	if descriptor.Description != "" {
		payload["description"] = descriptor.Description
	}
	if descriptor.InputSchema != nil {
		payload["inputSchema"] = descriptor.InputSchema
	}
	if descriptor.OutputSchema != nil {
		payload["outputSchema"] = descriptor.OutputSchema
	}
	if descriptor.ContentType != "" {
		payload["contentType"] = descriptor.ContentType
	}
	return payload
}

type SkillPathDescriptor struct {
	PathValue   string
	Description string
	ContentType string
}

func (descriptor SkillPathDescriptor) Path() string {
	return descriptor.PathValue
}

func (descriptor SkillPathDescriptor) DescriptorType() string {
	return "skill"
}

func (descriptor SkillPathDescriptor) ToMap() map[string]any {
	payload := map[string]any{
		"type":        "skill",
		"path":        descriptor.PathValue,
		"contentType": descriptor.ContentType,
	}
	if descriptor.Description != "" {
		payload["description"] = descriptor.Description
	}
	return payload
}

type PromptPathDescriptor struct {
	PathValue    string
	Description  string
	InputSchema  map[string]any
	OutputSchema map[string]any
}

func (descriptor PromptPathDescriptor) Path() string {
	return descriptor.PathValue
}

func (descriptor PromptPathDescriptor) DescriptorType() string {
	return "prompt"
}

func (descriptor PromptPathDescriptor) ToMap() map[string]any {
	payload := map[string]any{
		"type": "prompt",
		"path": descriptor.PathValue,
	}
	if descriptor.Description != "" {
		payload["description"] = descriptor.Description
	}
	if descriptor.InputSchema != nil {
		payload["inputSchema"] = descriptor.InputSchema
	}
	if descriptor.OutputSchema != nil {
		payload["outputSchema"] = descriptor.OutputSchema
	}
	return payload
}

type ClientDescriptor struct {
	ID          string
	Name        string
	Paths       []PathDescriptor
	Description string
	Version     string
	Platform    string
	Metadata    map[string]any
}

func NewClientDescriptor(info ClientInfo, paths []PathDescriptor) ClientDescriptor {
	return ClientDescriptor{
		ID:          info.ID,
		Name:        info.Name,
		Description: info.Description,
		Version:     info.Version,
		Platform:    info.Platform,
		Metadata:    info.Metadata,
		Paths:       paths,
	}
}

func (descriptor ClientDescriptor) ToMap() map[string]any {
	payload := map[string]any{
		"id":   descriptor.ID,
		"name": descriptor.Name,
		"paths": func() []map[string]any {
			result := make([]map[string]any, 0, len(descriptor.Paths))
			for _, path := range descriptor.Paths {
				result = append(result, path.ToMap())
			}
			return result
		}(),
	}
	if descriptor.Description != "" {
		payload["description"] = descriptor.Description
	}
	if descriptor.Version != "" {
		payload["version"] = descriptor.Version
	}
	if descriptor.Platform != "" {
		payload["platform"] = descriptor.Platform
	}
	if descriptor.Metadata != nil {
		payload["metadata"] = descriptor.Metadata
	}
	return payload
}

type SerializedError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details any    `json:"details,omitempty"`
}

func NewHandlerError(message string) SerializedError {
	return SerializedError{
		Code:    "handler_error",
		Message: message,
	}
}

type PathRequest struct {
	Params  map[string]any
	Queries map[string]any
	Body    any
	Headers map[string]string
}

type PathInvocationContext struct {
	RequestID string
	ClientID  string
	PathType  string
	Method    HttpMethod
	Path      string
	Auth      *AuthContext
}

type EndpointOptions struct {
	Description  string
	InputSchema  map[string]any
	OutputSchema map[string]any
	ContentType  string
}

type SkillOptions struct {
	Description string
	ContentType string
}

func DefaultSkillOptions() SkillOptions {
	return SkillOptions{ContentType: "text/markdown"}
}

type PromptOptions struct {
	Description  string
	InputSchema  map[string]any
	OutputSchema map[string]any
}
