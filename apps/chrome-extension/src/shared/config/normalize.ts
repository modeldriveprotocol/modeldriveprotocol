import {
  asRecord,
  createRequestId,
  readBoolean,
  readString,
  readStringArray
} from '../utils.js'
import {
  buildRepositoryMarketSourceUrl,
  createBackgroundClientConfig,
  createRouteClientConfig
} from './create.js'
import {
  cloneBackgroundExposeAssets,
  deriveDisabledBackgroundExposePaths,
  normalizeBackgroundExposeAssets,
  normalizeDisabledBackgroundExposePaths,
  normalizeLegacyDisabledBackgroundExposePaths
} from './background-assets.js'
import {
  DEFAULT_BACKGROUND_CLIENT,
  DEFAULT_BACKGROUND_CLIENTS,
  DEFAULT_EXTENSION_CONFIG,
  DEFAULT_OFFICIAL_MARKET_SOURCE,
  DEFAULT_WORKSPACE_MANAGEMENT_CLIENT,
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
  normalizeSkillFolders,
  normalizeSelectorResources,
  normalizeSkillEntries
} from './normalize-assets.js'
import {
  ensureRootRouteSkillAsset,
  syncRouteClientAssetViews
} from './route-assets.js'

export function normalizeConfig(value: unknown): ExtensionConfig {
  if (value === undefined || value === null) {
    return {
      ...DEFAULT_EXTENSION_CONFIG,
      backgroundClients: cloneDefaultBackgroundClients(),
      routeClients: []
    }
  }

  const migrated = migrateLegacyConfig(value)
  const record = asRecord(migrated)

  return {
    version: normalizeString(
      readString(record, 'version'),
      DEFAULT_EXTENSION_CONFIG.version
    ),
    serverUrl: normalizeString(
      readString(record, 'serverUrl'),
      DEFAULT_EXTENSION_CONFIG.serverUrl
    ),
    notificationTitle: normalizeString(
      readString(record, 'notificationTitle'),
      DEFAULT_EXTENSION_CONFIG.notificationTitle
    ),
    backgroundClients: normalizeBackgroundClients(
      'backgroundClients' in record
        ? record.backgroundClients
        : 'backgroundClient' in record
        ? [record.backgroundClient]
        : undefined
    ),
    routeClients: normalizeRouteClients(record.routeClients),
    marketSources: normalizeMarketSources(record.marketSources),
    marketAutoCheckUpdates:
      readBoolean(record, 'marketAutoCheckUpdates') ??
      DEFAULT_EXTENSION_CONFIG.marketAutoCheckUpdates
  }
}

function migrateLegacyConfig(value: unknown): unknown {
  const record = asRecord(value)

  if (
    'backgroundClient' in record ||
    'backgroundClients' in record ||
    'routeClients' in record
  ) {
    return value
  }

  const matchPatterns = readStringArray(record, 'matchPatterns') ?? []
  const pathScriptSource = readPathScriptSource(record)
  const legacyAutoConnect = readBoolean(record, 'autoConnect') ?? true
  const legacyAutoInjectBridge = readBoolean(record, 'autoInjectBridge') ?? true
  const legacyClientId =
    normalizeId(readString(record, 'clientId')) ?? 'mdp-chrome-extension'
  const legacyClientName = normalizeString(
    readString(record, 'clientName'),
    'Model Drive Protocol for Chrome'
  )
  const legacyClientDescription = normalizeString(
    readString(record, 'clientDescription'),
    'Chrome extension runtime that exposes browser and page capabilities through Model Drive Protocol.'
  )

  const routeClients =
    matchPatterns.length > 0 || pathScriptSource.length > 0
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
            pathScriptSource
          })
        ]
      : []

  return {
    version: DEFAULT_EXTENSION_CONFIG.version,
    serverUrl: normalizeString(
      readString(record, 'serverUrl'),
      DEFAULT_EXTENSION_CONFIG.serverUrl
    ),
    notificationTitle: normalizeString(
      readString(record, 'notificationTitle'),
      DEFAULT_EXTENSION_CONFIG.notificationTitle
    ),
    backgroundClients: [
      createBackgroundClientConfig({
        id: 'background-client-default',
        enabled: legacyAutoConnect,
        favorite: false,
        clientId: `${legacyClientId}-background`,
        clientName: `${legacyClientName} Background`,
        clientDescription: legacyClientDescription,
        icon: 'chrome',
        disabledExposePaths: [...DEFAULT_BACKGROUND_CLIENT.disabledExposePaths]
      })
    ],
    routeClients,
    marketSources: [DEFAULT_OFFICIAL_MARKET_SOURCE],
    marketAutoCheckUpdates: DEFAULT_EXTENSION_CONFIG.marketAutoCheckUpdates
  } satisfies ExtensionConfig
}

function normalizeBackgroundClient(value: unknown): BackgroundClientConfig {
  const record = asRecord(value)
  const fallback = resolveBackgroundClientFallback(record)
  const fallbackDisabledExposePaths = [...fallback.disabledExposePaths]
  const disabledExposePaths =
    'disabledExposePaths' in record
      ? normalizeDisabledBackgroundExposePaths(record.disabledExposePaths)
      : 'disabledTools' in record ||
          'disabledResources' in record ||
          'disabledSkills' in record
        ? normalizeLegacyDisabledBackgroundExposePaths({
            disabledTools: record.disabledTools,
            disabledResources: record.disabledResources,
            disabledSkills: record.disabledSkills
          })
        : fallbackDisabledExposePaths
  const exposes = normalizeBackgroundExposeAssets(
    'exposes' in record ? record.exposes : undefined,
    disabledExposePaths
  )

  const normalized: BackgroundClientConfig = {
    kind: 'background',
    id: normalizeId(readString(record, 'id')) ?? fallback.id,
    enabled: readBoolean(record, 'enabled') ?? fallback.enabled,
    favorite: readBoolean(record, 'favorite') ?? fallback.favorite,
    clientId: normalizeId(readString(record, 'clientId')) ?? fallback.clientId,
    clientName: normalizeString(
      readString(record, 'clientName'),
      fallback.clientName
    ),
    clientDescription: normalizeString(
      readString(record, 'clientDescription'),
      fallback.clientDescription
    ),
    icon: normalizeIcon(readString(record, 'icon'), fallback.icon),
    exposes,
    disabledExposePaths: deriveDisabledBackgroundExposePaths(exposes)
  }

  return stabilizeRequiredBackgroundClient(normalized)
}

function normalizeBackgroundClients(value: unknown): BackgroundClientConfig[] {
  if (!Array.isArray(value)) {
    return cloneDefaultBackgroundClients()
  }

  const normalized = value
    .map((item) => normalizeBackgroundClient(item))
    .filter(
      (client, index, array) =>
        array.findIndex((candidate) => candidate.id === client.id) === index
    )

  return ensureRequiredBackgroundClients(normalized)
}

function resolveBackgroundClientFallback(
  record: Record<string, unknown>
): BackgroundClientConfig {
  const normalizedId = normalizeId(readString(record, 'id'))
  const normalizedClientId = normalizeId(readString(record, 'clientId'))

  return normalizedId === DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.id ||
    normalizedClientId === DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.clientId
    ? DEFAULT_WORKSPACE_MANAGEMENT_CLIENT
    : DEFAULT_BACKGROUND_CLIENT
}

function cloneDefaultBackgroundClients(): BackgroundClientConfig[] {
  return DEFAULT_BACKGROUND_CLIENTS.map((client) => ({
    ...client,
    exposes: cloneBackgroundExposeAssets(client.exposes),
    disabledExposePaths: [...client.disabledExposePaths]
  }))
}

function ensureRequiredBackgroundClients(
  clients: BackgroundClientConfig[]
): BackgroundClientConfig[] {
  const normalized = [...clients]
  const existingIds = new Set(normalized.map((client) => client.id))

  if (!existingIds.has(DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.id)) {
    normalized.push({
      ...DEFAULT_WORKSPACE_MANAGEMENT_CLIENT,
      exposes: cloneBackgroundExposeAssets(
        DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.exposes
      ),
      disabledExposePaths: [
        ...DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.disabledExposePaths
      ]
    })
  }

  return normalized
}

function stabilizeRequiredBackgroundClient(
  client: BackgroundClientConfig
): BackgroundClientConfig {
  if (
    client.id !== DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.id &&
    client.clientId !== DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.clientId
  ) {
    return client
  }

  return {
    ...client,
    id: DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.id,
    enabled: DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.enabled,
    clientId: DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.clientId,
    exposes: cloneBackgroundExposeAssets(client.exposes),
    disabledExposePaths: [...client.disabledExposePaths]
  }
}

function normalizeRouteClients(value: unknown): RouteClientConfig[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => normalizeRouteClient(item))
    .filter(
      (client, index, array) =>
        array.findIndex((candidate) => candidate.id === client.id) === index
    )
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
    const id =
      normalizeId(readString(record, 'id')) ?? createRequestId('market-source')
    const official = readBoolean(record, 'official') ?? false

    if (kind === 'repository') {
      const provider = readString(record, 'provider')
      const repository = normalizeRepositoryIdentifier(
        readString(record, 'repository')
      )
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
  const clientName = normalizeString(
    readString(record, 'clientName'),
    'Route Client'
  )
  const routeId =
    normalizeId(readString(record, 'id')) ?? createRequestId('route-client')
  const clientId =
    normalizeId(readString(record, 'clientId')) ??
    buildClientId(clientName, routeId)
  const installSource = normalizeMarketInstallSource(record.installSource)
  const legacySkillEntries = normalizeSkillEntries(record.skillEntries)
  const legacySkillFolders = normalizeSkillFolders(
    record.skillFolders,
    legacySkillEntries
  )
  const hasLegacyRouteAssets =
    'recordings' in record ||
    'selectorResources' in record ||
    'skillEntries' in record ||
    'skillFolders' in record
  const exposes = ensureRootRouteSkillAsset(
    hasLegacyRouteAssets
      ? [
          ...legacySkillEntries,
          ...legacySkillFolders,
          ...normalizeRecordings(record.recordings),
          ...normalizeSelectorResources(record.selectorResources)
        ]
      : 'exposes' in record && Array.isArray(record.exposes)
        ? normalizeRouteExposes(record.exposes)
        : [
            ...legacySkillEntries,
            ...legacySkillFolders,
            ...normalizeRecordings(record.recordings),
            ...normalizeSelectorResources(record.selectorResources)
          ]
  )

  return syncRouteClientAssetViews({
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
    matchPatterns: normalizePatterns(
      readStringArray(record, 'matchPatterns') ?? []
    ),
    routeRules: normalizeRouteRules(record.routeRules),
    autoInjectBridge: readBoolean(record, 'autoInjectBridge') ?? true,
    pathScriptSource: readPathScriptSource(record),
    exposes,
    ...(installSource ? { installSource } : {})
  })
}

function normalizeRouteExposes(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  const recordings = normalizeRecordings(
    value.filter((item) => asRecord(item).kind === 'flow')
  )
  const selectorResources = normalizeSelectorResources(
    value.filter((item) => asRecord(item).kind === 'resource')
  )
  const skillEntries = normalizeSkillEntries(
    value.filter((item) => asRecord(item).kind === 'skill')
  )
  const skillFolders = normalizeSkillFolders(
    value.filter((item) => asRecord(item).kind === 'folder'),
    skillEntries
  )

  return [
    ...skillEntries,
    ...skillFolders,
    ...recordings,
    ...selectorResources
  ]
}

function readPathScriptSource(record: Record<string, unknown>): string {
  return (
    readString(record, 'pathScriptSource')?.trim() ??
    readString(record, 'toolScriptSource')?.trim() ??
    ''
  )
}

function normalizeMarketInstallSource(
  value: unknown
): MarketClientInstallSource | undefined {
  const record = asRecord(value)
  const type = readString(record, 'type')
  const sourceId = normalizeId(readString(record, 'sourceId'))
  const sourceUrl = normalizeMarketSourceUrl(readString(record, 'sourceUrl'))
  const marketClientId = normalizeId(readString(record, 'marketClientId'))
  const marketVersion = normalizeId(readString(record, 'marketVersion'))

  if (
    type !== 'market' ||
    !sourceId ||
    !sourceUrl ||
    !marketClientId ||
    !marketVersion
  ) {
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
        id:
          normalizeId(readString(record, 'id')) ??
          createRequestId('route-rule'),
        mode,
        value: rawValue
      } satisfies RoutePathRule
    })
    .filter((rule): rule is RoutePathRule => Boolean(rule))
}
