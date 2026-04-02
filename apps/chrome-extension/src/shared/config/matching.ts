import type { ExtensionConfig, RouteClientConfig, RoutePathRule } from './types.js'

import { uniqueStrings } from '../utils.js'
import { chromePatternToRegex } from './internal.js'

export function parseMatchPatterns(text: string): string[] {
  return uniqueStrings(
    text
      .split(/\r?\n/g)
      .map((pattern) => pattern.trim())
      .filter((pattern) => pattern.length > 0)
  )
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

export function matchesAnyPattern(url: string | undefined, patterns: string[]): boolean {
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

export function listWorkspaceMatchPatterns(config: ExtensionConfig): string[] {
  return uniqueStrings(
    config.routeClients
      .filter((client) => client.enabled)
      .flatMap((client) => client.matchPatterns)
  )
}

export function matchesRouteClient(url: string | undefined, client: RouteClientConfig): boolean {
  if (!url || !client.enabled || client.matchPatterns.length === 0) {
    return false
  }

  if (!matchesAnyPattern(url, client.matchPatterns)) {
    return false
  }

  return matchesRouteRules(url, client.routeRules)
}

export function matchesRouteRules(url: string | undefined, rules: RoutePathRule[]): boolean {
  if (!url) {
    return false
  }

  if (rules.length === 0) {
    return true
  }

  let parsed: URL

  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  const pathname = parsed.pathname
  const fullUrl = parsed.href

  return rules.every((rule) => {
    switch (rule.mode) {
      case 'pathname-prefix':
        return pathname.startsWith(rule.value)
      case 'pathname-exact':
        return pathname === rule.value
      case 'url-contains':
        return fullUrl.includes(rule.value)
      case 'regex':
        try {
          return new RegExp(rule.value).test(fullUrl)
        } catch {
          return false
        }
      default:
        return false
    }
  })
}

export function summarizeRouteRules(client: RouteClientConfig): string {
  if (client.routeRules.length === 0) {
    return 'Any path'
  }

  return client.routeRules
    .map((rule) => {
      switch (rule.mode) {
        case 'pathname-prefix':
          return `starts with ${rule.value}`
        case 'pathname-exact':
          return `is ${rule.value}`
        case 'url-contains':
          return `contains ${rule.value}`
        case 'regex':
          return `matches /${rule.value}/`
      }
    })
    .join(' and ')
}

export function suggestPathnameRule(pathname: string): string {
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
