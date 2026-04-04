import { createRequestId } from '../utils.js'
import {
  type BackgroundClientConfig,
  DEFAULT_EXTENSION_CONFIG,
  MARKET_CATALOG_SYNC_PATH,
  WORKSPACE_BUNDLE_SYNC_PATH,
  type MarketSourceConfig,
  type MarketSourceProvider,
  type MarketSourceRefType,
  type RouteClientConfig,
  type RoutePathRule,
  type RouteRuleMode
} from './types.js'
import {
  buildClientId,
  deriveRouteClientNameFromUrl,
  normalizeId,
  normalizeMarketSourceUrl,
  normalizePatterns,
  normalizeRepositoryIdentifier
} from './internal.js'
import { getOriginMatchPattern, suggestPathnameRule } from './matching.js'

export function createRouteClientConfig(
  overrides: Partial<RouteClientConfig> = {}
): RouteClientConfig {
  const sourceName = overrides.clientName?.trim() || 'Route Client'
  const routeId = normalizeId(overrides.id) ?? createRequestId('route-client')
  const clientId =
    normalizeId(overrides.clientId) ?? buildClientId(sourceName, routeId)

  return {
    kind: 'route',
    id: routeId,
    enabled: overrides.enabled ?? true,
    favorite: overrides.favorite ?? false,
    clientId,
    clientName: sourceName,
    clientDescription:
      overrides.clientDescription?.trim() ||
      'Route-scoped client for page automation, selector resources, and hierarchical skills.',
    icon: overrides.icon ?? 'route',
    matchPatterns: normalizePatterns(overrides.matchPatterns ?? []),
    routeRules: overrides.routeRules ?? [],
    autoInjectBridge: overrides.autoInjectBridge ?? true,
    pathScriptSource: overrides.pathScriptSource?.trim() ?? '',
    recordings: overrides.recordings ?? [],
    selectorResources: overrides.selectorResources ?? [],
    skillFolders: overrides.skillFolders ?? [],
    skillEntries: overrides.skillEntries ?? [],
    ...(overrides.installSource
      ? { installSource: overrides.installSource }
      : {})
  }
}

export function createBackgroundClientConfig(
  overrides: Partial<BackgroundClientConfig> = {}
): BackgroundClientConfig {
  const sourceName = overrides.clientName?.trim() || 'Background Client'
  const backgroundId =
    normalizeId(overrides.id) ?? createRequestId('background-client')
  const clientId =
    normalizeId(overrides.clientId) ?? buildClientId(sourceName, backgroundId)

  return {
    kind: 'background',
    id: backgroundId,
    enabled: overrides.enabled ?? true,
    favorite: overrides.favorite ?? false,
    clientId,
    clientName: sourceName,
    clientDescription:
      overrides.clientDescription?.trim() ||
      'Browser-level client for built-in extension exposes and background automation capabilities.',
    icon: overrides.icon ?? 'chrome',
    disabledExposePaths: overrides.disabledExposePaths ?? []
  }
}

export function createMarketSourceConfig(url: string): MarketSourceConfig {
  const normalizedUrl = normalizeMarketSourceUrl(url)

  if (!normalizedUrl) {
    throw new Error('Market source URL must use http or https.')
  }

  return {
    id: createRequestId('market-source'),
    kind: 'direct',
    url: normalizedUrl
  }
}

export function createRepositoryMarketSourceConfig(options: {
  provider: MarketSourceProvider
  repository: string
  refType: MarketSourceRefType
  ref: string
  official?: boolean
}): MarketSourceConfig {
  const repository = normalizeRepositoryIdentifier(options.repository)
  const ref = options.ref.trim()

  if (!repository || !ref) {
    throw new Error(
      'Repository-backed market source requires a repository and ref.'
    )
  }

  return {
    id: createRequestId('market-source'),
    kind: 'repository',
    provider: options.provider,
    repository,
    refType: options.refType,
    ref,
    url: buildRepositoryMarketSourceUrl(options.provider, repository, ref),
    ...(options.official ? { official: true } : {})
  }
}

export function createRouteRule(
  mode: RouteRuleMode = 'pathname-prefix',
  value = '/'
): RoutePathRule {
  return {
    id: createRequestId('route-rule'),
    mode,
    value
  }
}

export function createRouteClientFromUrl(
  url: string,
  overrides: Partial<RouteClientConfig> = {}
): RouteClientConfig {
  const parsed = new URL(url)
  const originPattern = getOriginMatchPattern(parsed.href)

  if (!originPattern) {
    throw new Error(
      'Open an http, https, or file page before creating a route client.'
    )
  }

  const pathnameRule = suggestPathnameRule(parsed.pathname)
  const defaultName =
    overrides.clientName?.trim() || deriveRouteClientNameFromUrl(parsed)

  return createRouteClientConfig({
    clientName: defaultName,
    clientId: overrides.clientId,
    clientDescription:
      overrides.clientDescription?.trim() ||
      `Route-scoped client for ${parsed.host}${pathnameRule}.`,
    icon: overrides.icon ?? 'route',
    matchPatterns: [originPattern],
    routeRules: [createRouteRule('pathname-prefix', pathnameRule)],
    ...overrides
  })
}

export function canCreateRouteClientFromUrl(url: string | undefined): boolean {
  return Boolean(getOriginMatchPattern(url))
}

export function isValidMarketSourceUrl(url: string): boolean {
  return Boolean(normalizeMarketSourceUrl(url))
}

export function buildRepositoryMarketSourceUrl(
  provider: MarketSourceProvider,
  repository: string,
  ref: string
): string {
  return buildRepositoryRawUrl(
    provider,
    repository,
    ref,
    MARKET_CATALOG_SYNC_PATH
  )
}

export function buildRepositoryWorkspaceBundleUrl(
  provider: MarketSourceProvider,
  repository: string,
  ref: string
): string {
  return buildRepositoryRawUrl(
    provider,
    repository,
    ref,
    WORKSPACE_BUNDLE_SYNC_PATH
  )
}

export function buildRepositoryRawUrl(
  provider: MarketSourceProvider,
  repository: string,
  ref: string,
  path: string
): string {
  const normalizedRepository = normalizeRepositoryIdentifier(repository)
  const normalizedRef = ref.trim()

  if (!normalizedRepository || !normalizedRef || !path.trim()) {
    throw new Error(
      'Repository-backed source requires a repository, ref, and path.'
    )
  }

  if (provider === 'github') {
    return `https://raw.githubusercontent.com/${normalizedRepository}/${encodeURIComponent(
      normalizedRef
    )}/${path}`
  }

  return `https://gitlab.com/${normalizedRepository}/-/raw/${encodeURIComponent(
    normalizedRef
  )}/${path}`
}
