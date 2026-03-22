import { asRecord, readBoolean, readString, readStringArray, uniqueStrings } from './utils.js'

export interface ExtensionConfig {
  serverUrl: string
  clientId: string
  clientName: string
  clientDescription: string
  autoConnect: boolean
  autoInjectBridge: boolean
  matchPatterns: string[]
  toolScriptSource: string
  notificationTitle: string
}

export const STORAGE_KEY = 'extensionConfig'

export const DEFAULT_EXTENSION_CONFIG: ExtensionConfig = {
  serverUrl: 'ws://127.0.0.1:47372',
  clientId: 'mdp-chrome-extension',
  clientName: 'MDP Chrome Extension',
  clientDescription: 'Chrome extension bridge that exposes extension and page capabilities through MDP.',
  autoConnect: true,
  autoInjectBridge: true,
  matchPatterns: [],
  toolScriptSource: '',
  notificationTitle: 'MDP Chrome Extension'
}

export function normalizeConfig(value: unknown): ExtensionConfig {
  const record = asRecord(value)
  const matchPatterns = readStringArray(record, 'matchPatterns')

  return {
    serverUrl: normalizeString(readString(record, 'serverUrl'), DEFAULT_EXTENSION_CONFIG.serverUrl),
    clientId: normalizeString(readString(record, 'clientId'), DEFAULT_EXTENSION_CONFIG.clientId),
    clientName: normalizeString(readString(record, 'clientName'), DEFAULT_EXTENSION_CONFIG.clientName),
    clientDescription: normalizeString(
      readString(record, 'clientDescription'),
      DEFAULT_EXTENSION_CONFIG.clientDescription
    ),
    autoConnect: readBoolean(record, 'autoConnect') ?? DEFAULT_EXTENSION_CONFIG.autoConnect,
    autoInjectBridge: readBoolean(record, 'autoInjectBridge') ?? DEFAULT_EXTENSION_CONFIG.autoInjectBridge,
    matchPatterns: matchPatterns === undefined
      ? DEFAULT_EXTENSION_CONFIG.matchPatterns
      : normalizePatterns(matchPatterns),
    toolScriptSource: readString(record, 'toolScriptSource')?.trim() ?? '',
    notificationTitle: normalizeString(
      readString(record, 'notificationTitle'),
      DEFAULT_EXTENSION_CONFIG.notificationTitle
    )
  }
}

export function parseMatchPatterns(text: string): string[] {
  return normalizePatterns(text.split(/\r?\n/g))
}

export function stringifyMatchPatterns(patterns: string[]): string {
  return patterns.join('\n')
}

export function isValidServerUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return ['ws:', 'wss:', 'http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}

export function isValidMatchPattern(pattern: string): boolean {
  try {
    void chromePatternToRegex(pattern)
    return true
  } catch {
    return false
  }
}

export function matchesAnyPattern(
  url: string | undefined,
  patterns: string[]
): boolean {
  if (!url) {
    return false
  }

  return patterns.some((pattern) => matchChromePattern(pattern, url))
}

export function matchChromePattern(pattern: string, url: string): boolean {
  return chromePatternToRegex(pattern).test(url)
}

export function getOriginMatchPattern(url: string | undefined): string | undefined {
  if (!url) {
    return undefined
  }

  try {
    const parsed = new URL(url)

    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return `${parsed.protocol}//${parsed.host}/*`
    }

    if (parsed.protocol === 'file:') {
      return 'file:///*'
    }

    return undefined
  } catch {
    return undefined
  }
}

function normalizePatterns(patterns: string[]): string[] {
  return uniqueStrings(
    patterns.map((pattern) => pattern.trim()).filter((pattern) => pattern.length > 0)
  )
}

function normalizeString(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallback
}

function chromePatternToRegex(pattern: string): RegExp {
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
