package mdp

import (
	"errors"
	"fmt"
	"strings"
	"sync"
)

type PathHandler func(PathRequest, PathInvocationContext) (any, error)

type procedureEntry struct {
	descriptor PathDescriptor
	handler    PathHandler
}

type resolvedProcedure struct {
	descriptor  PathDescriptor
	handler     PathHandler
	params      map[string]any
	specificity []int
}

type ProcedureRegistry struct {
	mu      sync.RWMutex
	entries []procedureEntry
}

func NewProcedureRegistry() *ProcedureRegistry {
	return &ProcedureRegistry{}
}

func (registry *ProcedureRegistry) ExposeEndpoint(
	path string,
	method HttpMethod,
	handler PathHandler,
	options EndpointOptions,
) error {
	return registry.register(
		EndpointPathDescriptor{
			PathValue:    path,
			Method:       method,
			Description:  options.Description,
			InputSchema:  options.InputSchema,
			OutputSchema: options.OutputSchema,
			ContentType:  options.ContentType,
		},
		handler,
	)
}

func (registry *ProcedureRegistry) ExposeSkillMarkdown(
	path string,
	content string,
	options SkillOptions,
) error {
	if options.ContentType == "" {
		options.ContentType = "text/markdown"
	}
	description := options.Description
	if description == "" {
		description = deriveMarkdownDescription(content)
	}
	return registry.register(
		SkillPathDescriptor{
			PathValue:   path,
			Description: description,
			ContentType: options.ContentType,
		},
		func(_ PathRequest, _ PathInvocationContext) (any, error) {
			return content, nil
		},
	)
}

func (registry *ProcedureRegistry) ExposePromptMarkdown(
	path string,
	content string,
	options PromptOptions,
) error {
	description := options.Description
	if description == "" {
		description = deriveMarkdownDescription(content)
	}
	return registry.register(
		PromptPathDescriptor{
			PathValue:    path,
			Description:  description,
			InputSchema:  options.InputSchema,
			OutputSchema: options.OutputSchema,
		},
		func(_ PathRequest, _ PathInvocationContext) (any, error) {
			return map[string]any{
				"messages": []map[string]any{
					{
						"role":    "user",
						"content": content,
					},
				},
			}, nil
		},
	)
}

func (registry *ProcedureRegistry) Unexpose(path string, method *HttpMethod) (bool, error) {
	if !IsPathPattern(path) {
		return false, fmt.Errorf("invalid path %q", path)
	}

	registry.mu.Lock()
	defer registry.mu.Unlock()

	for index, entry := range registry.entries {
		if entry.descriptor.Path() != path {
			continue
		}
		if endpoint, ok := entry.descriptor.(EndpointPathDescriptor); ok {
			if method != nil && endpoint.Method != *method {
				continue
			}
		}
		registry.entries = append(registry.entries[:index], registry.entries[index+1:]...)
		return true, nil
	}

	return false, nil
}

func (registry *ProcedureRegistry) DescribePaths() []PathDescriptor {
	registry.mu.RLock()
	defer registry.mu.RUnlock()

	result := make([]PathDescriptor, 0, len(registry.entries))
	for _, entry := range registry.entries {
		result = append(result, entry.descriptor)
	}
	return result
}

func (registry *ProcedureRegistry) Describe(client ClientInfo) ClientDescriptor {
	return NewClientDescriptor(client, registry.DescribePaths())
}

func (registry *ProcedureRegistry) Invoke(message CallClientMessage) (any, error) {
	entry := registry.resolveEntry(message.Method, message.Path)
	if entry == nil {
		return nil, fmt.Errorf("unknown path %q for method %q", message.Path, message.Method)
	}

	return entry.handler(
		PathRequest{
			Params:  entry.params,
			Queries: cloneMap(message.Query),
			Body:    message.Body,
			Headers: cloneStringMap(message.Headers),
		},
		PathInvocationContext{
			RequestID: message.RequestID,
			ClientID:  message.ClientID,
			PathType:  entry.descriptor.DescriptorType(),
			Method:    message.Method,
			Path:      message.Path,
			Auth:      message.Auth,
		},
	)
}

func (registry *ProcedureRegistry) register(descriptor PathDescriptor, handler PathHandler) error {
	if handler == nil {
		return errors.New("path handler is required")
	}
	if !IsPathPattern(descriptor.Path()) {
		return fmt.Errorf("invalid path %q", descriptor.Path())
	}
	if err := assertDescriptorPathShape(descriptor); err != nil {
		return err
	}

	registry.mu.Lock()
	defer registry.mu.Unlock()

	key := registrationKey(descriptor)
	entry := procedureEntry{descriptor: descriptor, handler: handler}
	for index, current := range registry.entries {
		if registrationKey(current.descriptor) == key {
			registry.entries[index] = entry
			return nil
		}
	}
	registry.entries = append(registry.entries, entry)
	return nil
}

func (registry *ProcedureRegistry) resolveEntry(method HttpMethod, path string) *resolvedProcedure {
	registry.mu.RLock()
	defer registry.mu.RUnlock()

	var bestMatch *resolvedProcedure
	for _, entry := range registry.entries {
		if !matchesMethod(entry.descriptor, method) {
			continue
		}
		match := MatchPathPattern(entry.descriptor.Path(), path)
		if match == nil {
			continue
		}
		if bestMatch == nil || ComparePathSpecificity(match.Specificity, bestMatch.specificity) > 0 {
			bestMatch = &resolvedProcedure{
				descriptor:  entry.descriptor,
				handler:     entry.handler,
				params:      cloneMap(match.Params),
				specificity: append([]int(nil), match.Specificity...),
			}
		}
	}
	return bestMatch
}

func registrationKey(descriptor PathDescriptor) string {
	if endpoint, ok := descriptor.(EndpointPathDescriptor); ok {
		return string(endpoint.Method) + " " + endpoint.PathValue
	}
	return descriptor.Path()
}

func matchesMethod(descriptor PathDescriptor, method HttpMethod) bool {
	if endpoint, ok := descriptor.(EndpointPathDescriptor); ok {
		return endpoint.Method == method
	}
	return method == HttpMethodGet
}

func assertDescriptorPathShape(descriptor PathDescriptor) error {
	path := descriptor.Path()

	switch descriptor.(type) {
	case EndpointPathDescriptor:
		if IsSkillPath(path) || IsPromptPath(path) {
			return errors.New("endpoint path cannot target reserved skill or prompt leaves")
		}
	case SkillPathDescriptor:
		if !IsSkillPath(path) {
			return errors.New("skill paths must end with skill.md or SKILL.md")
		}
	case PromptPathDescriptor:
		if !IsPromptPath(path) {
			return errors.New("prompt paths must end with prompt.md or PROMPT.md")
		}
	}
	return nil
}

func deriveMarkdownDescription(content string) string {
	var paragraph []string
	for _, rawLine := range strings.Split(content, "\n") {
		line := strings.TrimSpace(rawLine)
		if line == "" {
			if len(paragraph) > 0 {
				break
			}
			continue
		}
		if strings.HasPrefix(line, "#") {
			continue
		}
		paragraph = append(paragraph, line)
	}
	return strings.Join(paragraph, " ")
}

func cloneMap(value map[string]any) map[string]any {
	if value == nil {
		return map[string]any{}
	}
	result := make(map[string]any, len(value))
	for key, entry := range value {
		result[key] = entry
	}
	return result
}

func cloneStringMap(value map[string]string) map[string]string {
	if value == nil {
		return map[string]string{}
	}
	result := make(map[string]string, len(value))
	for key, entry := range value {
		result[key] = entry
	}
	return result
}
