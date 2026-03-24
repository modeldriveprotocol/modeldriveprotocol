import { asRecord, createRequestId, readBoolean, readString, readStringArray } from '../utils.js'
import { createRouteClientConfig, buildRepositoryMarketSourceUrl } from './create.js'
import {
  DEFAULT_BACKGROUND_CLIENT,
  DEFAULT_EXTENSION_CONFIG,
  DEFAULT_OFFICIAL_MARKET_SOURCE,
  type BackgroundClientConfig,
  type ExtensionConfig,
  type MarketClientInstallSource,
  type MarketSourceConfig,
  type RouteClientConfig,
  type RoutePathRule,
  type RouteSelectorResource
} from './types.js'
import {
  buildClientId,
  isRouteRuleMode,
  normalizeIcon,
  normalizeId,
  normalizeMarketSourceUrl,
  normalizePatterns,
  normalizeRepositoryIdentifier,
  normalizeString,
  normalizeTimestamp
} from './internal.js'
import {
  normalizeRecordings,
  normalizeSelectorResources,
  normalizeSkillEntries
} from './normalize-assets.js'

export function normalizeConfig(value: unknown): ExtensionConfig {
  if (value === undefined || value === null) {
    return {
      ...DEFAULT_EXTENSION_CONFIG,
      backgroundClient: { ...DEFAULT_BACKGROUND_CLIENT },
      routeClients: []
    }
  }

  const migrated = migrateLegacyConfig(value)
  const record = asRecord(migrated)

  return {
    version: normalizeString(readString(record, 'version'), DEFAULT_EXTENSION_CONFIG.version),
    serverUrl: normalizeString(readString(record, 'serverUrl'), DEFAULT_EXTENSION_CONFIG.serverUrl),
    notificationTitle: normalizeString(
      readString(record, 'notificationTitle'),
      DEFAULT_EXTENSION_CONFIG.notificationTitle
    ),
    backgroundClient: normalizeBackgroundClient(record.backgroundClient),
    routeClients: normalizeRouteClients(record.routeClients),
    marketSources: normalizeMarketSources(record.marketSources),
    marketAutoCheckUpdates:
      readBoolean(record, 'marketAutoCheckUpdates') ?? DEFAULT_EXTENSION_CONFIG.marketAutoCheckUpdates
  }
}

function migrateLegacyConfig(value: unknown): unknown {
  const record = asRecord(value)

  if ('backgroundClient' in record || 'routeClients' in record) {
    return value
  }

  const matchPatterns = readStringArray(record, 'matchPatterns') ?? []
  const toolScriptSource = readString(record, 'toolScriptSource')?.trim() ?? ''
  const legacyAutoConnect = readBoolean(record, 'autoConnect') ?? true
  const legacyAutoInjectBridge = readBoolean(record, 'autoInjectBridge') ?? true
  const legacyClientId = normalizeId(readString(record, 'clientId')) ?? 'mdp-chrome-extension'
  const legacyClientName = normalizeString(
    readString(record, 'clientName'),
    'Model Drive Protocol for Chrome'
  )
  const legacyClientDescription = normalizeString(
    readString(record, 'clientDescription'),
    'Chrome extension runtime that exposes browser and page capabilities through Model Drive Protocol.'
  )

  const routeClients =
    matchPatterns.length > 0 || toolScriptSource.length > 0
      ? [
          createRouteClientConfig({
            id: `${legacyClientId}-route`,
            enabled: legacyAutoConnect,
            clientId: `${legacyClientId}-page`,
            clientName: `${legacyClientName} Page`,
            clientDescription: `${legacyClientDescription} Route-scoped page automation client.`,
            icon: 'route',
            matchPatterns,
            autoInjectBridge: legacyAutoInjectBridge,
            toolScriptSource
          })
        ]
      : []

  return {
    version: DEFAULT_EXTENSION_CONFIG.version,
    serverUrl: normalizeString(readString(record, 'serverUrl'), DEFAULT_EXTENSION_CONFIG.serverUrl),
    notificationTitle: normalizeString(
      readString(record, 'notificationTitle'),
      DEFAULT_EXTENSION_CONFIG.notificationTitle
    ),
    backgroundClient: {
      kind: 'background',
      enabled: legacyAutoConnect,
      favorite: false,
      clientId: `${legacyClientId}-background`,
      clientName: `${legacyClientName} Background`,
      clientDescription: legacyClientDescription,
      icon: 'chrome'
    },
    routeClients,
    marketSources: [DEFAULT_OFFICIAL_MARKET_SOURCE],
    marketAutoCheckUpdates: DEFAULT_EXTENSION_CONFIG.marketAutoCheckUpdates
  } satisfies ExtensionConfig
}

function normalizeBackgroundClient(value: unknown): BackgroundClientConfig {
  const record = asRecord(value)

  return {
    kind: 'background',
    enabled: readBoolean(record, 'enabled') ?? DEFAULT_BACKGROUND_CLIENT.enabled,
    favorite: readBoolean(record, 'favorite') ?? DEFAULT_BACKGROUND_CLIENT.favorite,
    clientId: normalizeId(readString(record, 'clientId')) ?? DEFAULT_BACKGROUND_CLIENT.clientId,
    clientName: normalizeString(readString(record, 'clientName'), DEFAULT_BACKGROUND_CLIENT.clientName),
    clientDescription: normalizeString(
      readString(record, 'clientDescription'),
      DEFAULT_BACKGROUND_CLIENT.clientDescription
    ),
    icon: normalizeIcon(readString(record, 'icon'), DEFAULT_BACKGROUND_CLIENT.icon)
  }
}

function normalizeRouteClients(value: unknown): RouteClientConfig[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => normalizeRouteClient(item))
    .filter((client, index, array) => array.findIndex((candidate) => candidate.id === client.id) === index)
}

function normalizeMarketSources(value: unknown): MarketSourceConfig[] {
  if (!Array.isArray(value)) {
    return [{ ...DEFAULT_OFFICIAL_MARKET_SOURCE }]
  }

  const seenUrls = new Set<string>()
  const normalized: MarketSourceConfig[] = []

  for (const item of value) {
    const record = asRecord(item)
    const kind = readString(record, 'kind')
    const id = normalizeId(readString(record, 'id')) ?? createRequestId('market-source')
    const official = readBoolean(record, 'official') ?? false

    if (kind === 'repository') {
      const provider = readString(record, 'provider')
      const repository = normalizeRepositoryIdentifier(readString(record, 'repository'))
      const refType = readString(record, 'refType')
      const ref = readString(record, 'ref')?.trim()

      if (
        (provider !== 'github' && provider !== 'gitlab') ||
        !repository ||
        (refType !== 'branch' && refType !== 'tag' && refType !== 'commit') ||
        !ref
      ) {
        continue
      }

      const url = buildRepositoryMarketSourceUrl(provider, repository, ref)

      if (seenUrls.has(url)) {
        continue
      }

      seenUrls.add(url)
      normalized.push({
        id,
        kind: 'repository',
        provider,
        repository,
        refType,
        ref,
        url,
        ...(official ? { official: true } : {})
      })
      continue
    }

    const normalizedUrl = normalizeMarketSourceUrl(readString(record, 'url'))

    if (!normalizedUrl || seenUrls.has(normalizedUrl)) {
      continue
    }

    seenUrls.add(normalizedUrl)
    normalized.push({
      id,
      kind: 'direct',
      url: normalizedUrl,
      ...(official ? { official: true } : {})
    })
  }

  return normalized
}

function normalizeRouteClient(value: unknown): RouteClientConfig {
  const record = asRecord(value)
  const clientName = normalizeString(readString(record, 'clientName'), 'Route Client')
  const routeId = normalizeId(readString(record, 'id')) ?? createRequestId('route-client')
  const clientId = normalizeId(readString(record, 'clientId')) ?? buildClientId(clientName, routeId)
  const installSource = normalizeMarketInstallSource(record.installSource)

  return {
    kind: 'route',
    id: routeId,
    enabled: readBoolean(record, 'enabled') ?? true,
    favorite: readBoolean(record, 'favorite') ?? false,
    clientId,
    clientName,
    clientDescription: normalizeString(
      readString(record, 'clientDescription'),
      'Route-scoped client for page automation, selector resources, and hierarchical skills.'
    ),
    icon: normalizeIcon(readString(record, 'icon'), 'route'),
    matchPatterns: normalizePatterns(readStringArray(record, 'matchPatterns') ?? []),
    routeRules: normalizeRouteRules(record.routeRules),
    autoInjectBridge: readBoolean(record, 'autoInjectBridge') ?? true,
    toolScriptSource: readString(record, 'toolScriptSource')?.trim() ?? '',
    recordings: normalizeRecordings(record.recordings),
    selectorResources: normalizeSelectorResources(record.selectorResources),
    skillEntries: normalizeSkillEntries(record.skillEntries),
    ...(installSource ? { installSource } : {})
  }
}

function normalizeMarketInstallSource(value: unknown): MarketClientInstallSource | undefined {
  const record = asRecord(value)
  const type = readString(record, 'type')
  const sourceId = normalizeId(readString(record, 'sourceId'))
  const sourceUrl = normalizeMarketSourceUrl(readString(record, 'sourceUrl'))
  const marketClientId = normalizeId(readString(record, 'marketClientId'))
  const marketVersion = normalizeId(readString(record, 'marketVersion'))

  if (type !== 'market' || !sourceId || !sourceUrl || !marketClientId || !marketVersion) {
    return undefined
  }

  return {
    type: 'market',
    sourceId,
    sourceUrl,
    marketClientId,
    marketVersion,
    installedAt: normalizeTimestamp(readString(record, 'installedAt'))
  }
}

function normalizeRouteRules(value: unknown): RoutePathRule[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      const record = asRecord(item)
      const mode = readString(record, 'mode')
      const rawValue = readString(record, 'value')?.trim()

      if (!rawValue || !isRouteRuleMode(mode)) {
        return undefined
      }

      return {
        id: normalizeId(readString(record, 'id')) ?? createRequestId('route-rule'),
        mode,
        value: rawValue
      } satisfies RoutePathRule
    })
    .filter((rule): rule is RoutePathRule => Boolean(rule))
}
