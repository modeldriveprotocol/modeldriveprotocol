import type { RpcArguments } from './json.js'

const STATIC_SEGMENT_PATTERN = /^[a-z0-9](?:[a-z0-9_-]*)$/
const PARAM_SEGMENT_PATTERN = /^:[a-z0-9](?:[a-z0-9_-]*)$/
const RESERVED_LEAF_NAMES = new Set(['skill.md', 'prompt.md'])

export interface PathPatternMatch {
  params: RpcArguments
  specificity: number[]
}

export function isPathPattern(value: unknown): value is string {
  return validatePath(value, true)
}

export function isConcretePath(value: unknown): value is string {
  return validatePath(value, false)
}

export function isSkillPath(value: unknown): value is string {
  return isPathPattern(value) && value.endsWith('/skill.md')
}

export function isPromptPath(value: unknown): value is string {
  return isPathPattern(value) && value.endsWith('/prompt.md')
}

export function matchPathPattern(pattern: string, path: string): PathPatternMatch | undefined {
  if (!isPathPattern(pattern) || !isConcretePath(path)) {
    return undefined
  }

  const patternSegments = splitPath(pattern)
  const pathSegments = splitPath(path)

  if (patternSegments.length !== pathSegments.length) {
    return undefined
  }

  const params: RpcArguments = {}
  const specificity: number[] = []

  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index] as string
    const pathSegment = pathSegments[index] as string

    if (patternSegment.startsWith(':')) {
      params[patternSegment.slice(1)] = pathSegment
      specificity.push(0)
      continue
    }

    if (patternSegment !== pathSegment) {
      return undefined
    }

    specificity.push(isReservedLeafName(patternSegment) ? 1 : 2)
  }

  return { params, specificity }
}

export function comparePathSpecificity(
  leftSpecificity: number[],
  rightSpecificity: number[]
): number {
  const length = Math.max(leftSpecificity.length, rightSpecificity.length)

  for (let index = 0; index < length; index += 1) {
    const left = leftSpecificity[index] ?? -1
    const right = rightSpecificity[index] ?? -1

    if (left !== right) {
      return left - right
    }
  }

  return 0
}

function validatePath(value: unknown, allowParams: boolean): value is string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.includes('?') || value.includes('#')) {
    return false
  }

  const segments = splitPath(value)

  if (segments.length === 0) {
    return false
  }

  return segments.every((segment, index) => {
    if (!segment) {
      return false
    }

    const isLast = index === segments.length - 1

    if (isReservedLeafName(segment)) {
      return isLast
    }

    if (allowParams && PARAM_SEGMENT_PATTERN.test(segment)) {
      return true
    }

    return STATIC_SEGMENT_PATTERN.test(segment)
  })
}

function splitPath(value: string): string[] {
  return value.split('/').slice(1)
}

function isReservedLeafName(value: string): boolean {
  return RESERVED_LEAF_NAMES.has(value)
}
