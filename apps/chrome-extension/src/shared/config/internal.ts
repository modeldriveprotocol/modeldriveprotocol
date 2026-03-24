import type {
  ClientIconKey,
  RouteRuleMode,
  SelectorResourceAttributeMap
} from './types.js'

import { asRecord, uniqueStrings } from '../utils.js'

export function normalizePatterns(patterns: string[]): string[] {
  return uniqueStrings(
    patterns.map((pattern) => pattern.trim()).filter((pattern) => pattern.length > 0)
  )
}

export function normalizeString(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallback
}

export function normalizeMarketSourceUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  try {
    const parsed = new URL(value)

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined
    }

    return parsed.toString()
  } catch {
    return undefined
  }
}

export function normalizeRepositoryIdentifier(value: string | undefined): string | undefined {
  const trimmed = value?.trim()

  if (!trimmed) {
    return undefined
  }

  const withoutGit = trimmed.replace(/\.git$/, '')

  if (withoutGit.startsWith('http://') || withoutGit.startsWith('https://')) {
    try {
      const parsed = new URL(withoutGit)
      const parts = parsed.pathname.split('/').filter((segment) => segment.length > 0)
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : undefined
    } catch {
      return undefined
    }
  }

  const sshMatch = withoutGit.match(/^[^:]+:([^/]+\/[^/]+)$/)
  if (sshMatch) {
    return sshMatch[1]
  }

  return /^[^/]+\/[^/]+$/.test(withoutGit) ? withoutGit : undefined
}

export function normalizeTimestamp(value: string | undefined): string {
  if (!value) {
    return new Date().toISOString()
  }

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : new Date().toISOString()
}

export function normalizeOffset(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
}

export function normalizeSkillPath(value: string | undefined): string | undefined {
  const trimmed = value
    ?.split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .join('/')

  return trimmed && trimmed.length > 0 ? trimmed : undefined
}

export function deriveSkillTitle(path: string): string {
  return path
    .split('/')
    .at(-1)
    ?.replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) ?? 'Skill'
}

export function deriveRouteClientNameFromUrl(parsed: URL): string {
  const host = parsed.hostname.replace(/^www\./, '')
  const rule = suggestPathnameRule(parsed.pathname)
  const suffix = rule === '/'
    ? 'Root'
    : rule
        .split('/')
        .filter((segment) => segment.length > 0)
        .map((segment) => segment.replace(/[-_]+/g, ' '))
        .map((segment) => segment.replace(/\b\w/g, (letter) => letter.toUpperCase()))
        .join(' ')

  return `${host} ${suffix}`.trim()
}

export function buildClientId(name: string, routeId: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug ? `mdp-${slug}` : routeId
}

export function normalizeId(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : undefined
}

export function isRouteRuleMode(value: string | undefined): value is RouteRuleMode {
  return (
    value === 'pathname-prefix' ||
    value === 'pathname-exact' ||
    value === 'url-contains' ||
    value === 'regex'
  )
}

export function normalizeIcon(value: string | undefined, fallback: ClientIconKey): ClientIconKey {
  switch (value) {
    case 'chrome':
    case 'route':
    case 'robot':
    case 'code':
    case 'layers':
    case 'insights':
    case 'spark':
    case 'javascript':
    case 'html':
    case 'css':
      return value
    default:
      return fallback
  }
}

export function normalizeAttributeMap(value: unknown): SelectorResourceAttributeMap {
  const record = asRecord(value)
  const normalized: SelectorResourceAttributeMap = {}

  for (const [key, item] of Object.entries(record)) {
    if (typeof item === 'string' && item.trim().length > 0) {
      normalized[key] = item.trim()
    }
  }

  return normalized
}

export function chromePatternToRegex(pattern: string): RegExp {
  if (pattern === '<all_urls>') {
    return /^(https?|file|ftp):\/\//
  }

  const separatorIndex = pattern.indexOf('://')

  if (separatorIndex === -1) {
    throw new Error(`Invalid match pattern: ${pattern}`)
  }

  const schemePattern = pattern.slice(0, separatorIndex)
  const hostAndPath = pattern.slice(separatorIndex + 3)
  const firstSlashIndex = hostAndPath.indexOf('/')

  if (firstSlashIndex === -1) {
    throw new Error(`Invalid match pattern: ${pattern}`)
  }

  const hostPattern = hostAndPath.slice(0, firstSlashIndex)
  const pathPattern = hostAndPath.slice(firstSlashIndex)
  const schemeRegex = schemePattern === '*'
    ? 'https?'
    : escapeRegex(schemePattern).replace(/\\\*/g, 'https?')

  const hostRegex = buildHostRegex(hostPattern, schemePattern)
  const pathRegex = escapeRegex(pathPattern).replace(/\\\*/g, '.*')

  if (schemePattern === 'file') {
    return new RegExp(`^file://${pathRegex.slice(1)}$`)
  }

  return new RegExp(`^${schemeRegex}:\\/\\/${hostRegex}${pathRegex}$`)
}

function buildHostRegex(hostPattern: string, schemePattern: string): string {
  if (schemePattern === 'file') {
    return ''
  }

  if (hostPattern === '*') {
    return '[^/]+'
  }

  if (hostPattern.startsWith('*.')) {
    return `(?:[^/]+\\.)*${escapeRegex(hostPattern.slice(2))}`
  }

  return escapeRegex(hostPattern).replace(/\\\*/g, '.*')
}

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.*]/g, '\\$&')
}

function suggestPathnameRule(pathname: string): string {
  const normalized = pathname.trim()

  if (!normalized || normalized === '/') {
    return '/'
  }

  const [firstSegment, secondSegment] = normalized.split('/').filter((segment) => segment.length > 0)

  if (!firstSegment) {
    return '/'
  }

  if (!secondSegment) {
    return `/${firstSegment}`
  }

  return `/${firstSegment}/${secondSegment}`
}
