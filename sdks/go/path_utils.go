package mdp

import (
	"regexp"
	"strings"
)

var staticSegmentPattern = regexp.MustCompile(`^(?:[a-z0-9](?:[a-z0-9_-]*)?|\.[a-z0-9](?:[a-z0-9_-]*)?)$`)
var paramSegmentPattern = regexp.MustCompile(`^:[a-z0-9](?:[a-z0-9_-]*)$`)

var reservedLeafNames = map[string]struct{}{
	"skill.md":  {},
	"prompt.md": {},
	"SKILL.md":  {},
	"PROMPT.md": {},
}

type PathPatternMatch struct {
	Params      map[string]any
	Specificity []int
}

func IsPathPattern(value string) bool {
	return validatePath(value, true)
}

func IsConcretePath(value string) bool {
	return validatePath(value, false)
}

func IsSkillPath(value string) bool {
	if !IsPathPattern(value) {
		return false
	}
	segments := splitPath(value)
	if len(segments) == 0 {
		return false
	}
	leaf := segments[len(segments)-1]
	return leaf == "skill.md" || leaf == "SKILL.md"
}

func IsPromptPath(value string) bool {
	if !IsPathPattern(value) {
		return false
	}
	segments := splitPath(value)
	if len(segments) == 0 {
		return false
	}
	leaf := segments[len(segments)-1]
	return leaf == "prompt.md" || leaf == "PROMPT.md"
}

func MatchPathPattern(pattern string, path string) *PathPatternMatch {
	if !IsPathPattern(pattern) || !IsConcretePath(path) {
		return nil
	}

	patternSegments := splitPath(pattern)
	pathSegments := splitPath(path)
	if len(patternSegments) != len(pathSegments) {
		return nil
	}

	params := map[string]any{}
	specificity := make([]int, 0, len(patternSegments))
	for index := range patternSegments {
		patternSegment := patternSegments[index]
		pathSegment := pathSegments[index]

		if strings.HasPrefix(patternSegment, ":") {
			params[strings.TrimPrefix(patternSegment, ":")] = pathSegment
			specificity = append(specificity, 0)
			continue
		}

		if patternSegment != pathSegment {
			return nil
		}

		if isReservedLeafName(patternSegment) {
			specificity = append(specificity, 1)
		} else {
			specificity = append(specificity, 2)
		}
	}

	return &PathPatternMatch{
		Params:      params,
		Specificity: specificity,
	}
}

func ComparePathSpecificity(left []int, right []int) int {
	maxLength := len(left)
	if len(right) > maxLength {
		maxLength = len(right)
	}

	for index := 0; index < maxLength; index += 1 {
		leftValue := -1
		rightValue := -1
		if index < len(left) {
			leftValue = left[index]
		}
		if index < len(right) {
			rightValue = right[index]
		}
		if leftValue != rightValue {
			return leftValue - rightValue
		}
	}

	return 0
}

func validatePath(value string, allowParams bool) bool {
	if !strings.HasPrefix(value, "/") || strings.Contains(value, "?") || strings.Contains(value, "#") {
		return false
	}

	segments := splitPath(value)
	if len(segments) == 0 {
		return false
	}

	for index, segment := range segments {
		if segment == "" {
			return false
		}
		isLast := index == len(segments)-1
		if isReservedLeafName(segment) {
			if !isLast {
				return false
			}
			continue
		}
		if allowParams && paramSegmentPattern.MatchString(segment) {
			continue
		}
		if !staticSegmentPattern.MatchString(segment) {
			return false
		}
	}

	return true
}

func splitPath(value string) []string {
	return strings.Split(strings.TrimPrefix(value, "/"), "/")
}

func isReservedLeafName(value string) bool {
	_, ok := reservedLeafNames[value]
	return ok
}
