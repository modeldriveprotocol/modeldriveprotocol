import { type ExtensionConfig, STORAGE_KEY, normalizeConfig } from './config.js'

export const MARKET_SYNC_STATE_KEY = 'marketSourceSyncState'
export const BACKGROUND_STARTUP_DIAGNOSTICS_KEY = 'backgroundStartupDiagnostics'

export interface MarketSourceSnapshot {
  sourceId: string
  sourceUrl: string
  title: string
  version: string
  digest: string
  checkedAt: string
  clientCount: number
}

export interface MarketSourcePendingUpdate {
  sourceId: string
  sourceUrl: string
  title: string
  version: string
  checkedAt: string
}

export interface MarketSourceSyncState {
  lastCheckedAt?: string
  snapshots: MarketSourceSnapshot[]
  pendingUpdates: MarketSourcePendingUpdate[]
}

export interface BackgroundStartupDiagnostics {
  stage: string
  message: string
  stack?: string
  cause?: string
  updatedAt: string
}

export async function loadConfig(): Promise<ExtensionConfig> {
  const stored = (await chrome.storage.local.get(STORAGE_KEY)) as Record<string, unknown>
  return normalizeConfig(stored[STORAGE_KEY])
}

export async function saveConfig(config: ExtensionConfig): Promise<ExtensionConfig> {
  const normalized = normalizeConfig(config)

  await chrome.storage.local.set({
    [STORAGE_KEY]: normalized
  })

  return normalized
}

export async function patchConfig(patch: Partial<ExtensionConfig>): Promise<ExtensionConfig> {
  const current = await loadConfig()
  return saveConfig({
    ...current,
    ...patch
  })
}

export async function loadMarketSourceSyncState(): Promise<MarketSourceSyncState> {
  const stored = (await chrome.storage.local.get(MARKET_SYNC_STATE_KEY)) as Record<string, unknown>
  const record = stored[MARKET_SYNC_STATE_KEY]

  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return {
      snapshots: [],
      pendingUpdates: []
    }
  }

  const value = record as Record<string, unknown>
  const snapshots = Array.isArray(value.snapshots)
    ? value.snapshots
        .map((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            return undefined
          }

          const snapshot = item as Record<string, unknown>
          const sourceId = typeof snapshot.sourceId === 'string' ? snapshot.sourceId : undefined
          const sourceUrl = typeof snapshot.sourceUrl === 'string' ? snapshot.sourceUrl : undefined
          const title = typeof snapshot.title === 'string' ? snapshot.title : undefined
          const version = typeof snapshot.version === 'string' ? snapshot.version : undefined
          const digest = typeof snapshot.digest === 'string' ? snapshot.digest : undefined
          const checkedAt = typeof snapshot.checkedAt === 'string' ? snapshot.checkedAt : undefined
          const clientCount = typeof snapshot.clientCount === 'number' ? snapshot.clientCount : undefined

          if (!sourceId || !sourceUrl || !title || !version || !digest || !checkedAt || clientCount === undefined) {
            return undefined
          }

          return {
            sourceId,
            sourceUrl,
            title,
            version,
            digest,
            checkedAt,
            clientCount
          } satisfies MarketSourceSnapshot
        })
        .filter((item): item is MarketSourceSnapshot => Boolean(item))
    : []

  const pendingUpdates = Array.isArray(value.pendingUpdates)
    ? value.pendingUpdates
        .map((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            return undefined
          }

          const update = item as Record<string, unknown>
          const sourceId = typeof update.sourceId === 'string' ? update.sourceId : undefined
          const sourceUrl = typeof update.sourceUrl === 'string' ? update.sourceUrl : undefined
          const title = typeof update.title === 'string' ? update.title : undefined
          const version = typeof update.version === 'string' ? update.version : undefined
          const checkedAt = typeof update.checkedAt === 'string' ? update.checkedAt : undefined

          if (!sourceId || !sourceUrl || !title || !version || !checkedAt) {
            return undefined
          }

          return {
            sourceId,
            sourceUrl,
            title,
            version,
            checkedAt
          } satisfies MarketSourcePendingUpdate
        })
        .filter((item): item is MarketSourcePendingUpdate => Boolean(item))
    : []

  return {
    ...(typeof value.lastCheckedAt === 'string' ? { lastCheckedAt: value.lastCheckedAt } : {}),
    snapshots,
    pendingUpdates
  }
}

export async function saveMarketSourceSyncState(state: MarketSourceSyncState): Promise<MarketSourceSyncState> {
  await chrome.storage.local.set({
    [MARKET_SYNC_STATE_KEY]: state
  })

  return state
}

export async function loadBackgroundStartupDiagnostics(): Promise<BackgroundStartupDiagnostics | undefined> {
  const stored = (await chrome.storage.local.get(
    BACKGROUND_STARTUP_DIAGNOSTICS_KEY
  )) as Record<string, unknown>
  const value = stored[BACKGROUND_STARTUP_DIAGNOSTICS_KEY]

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  const record = value as Record<string, unknown>
  const stage = typeof record.stage === 'string' ? record.stage : undefined
  const message = typeof record.message === 'string' ? record.message : undefined
  const updatedAt =
    typeof record.updatedAt === 'string' ? record.updatedAt : undefined

  if (!stage || !message || !updatedAt) {
    return undefined
  }

  return {
    stage,
    message,
    updatedAt,
    ...(typeof record.stack === 'string' ? { stack: record.stack } : {}),
    ...(typeof record.cause === 'string' ? { cause: record.cause } : {})
  }
}

export async function saveBackgroundStartupDiagnostics(
  diagnostics: BackgroundStartupDiagnostics
): Promise<BackgroundStartupDiagnostics> {
  await chrome.storage.local.set({
    [BACKGROUND_STARTUP_DIAGNOSTICS_KEY]: diagnostics
  })

  return diagnostics
}

export async function clearBackgroundStartupDiagnostics(): Promise<void> {
  await chrome.storage.local.remove(BACKGROUND_STARTUP_DIAGNOSTICS_KEY)
}
