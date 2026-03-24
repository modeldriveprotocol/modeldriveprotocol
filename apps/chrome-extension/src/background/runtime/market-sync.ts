import { createMarketCatalogDigest, fetchMarketCatalog } from '#~/shared/market-catalog.js'
import {
  loadMarketSourceSyncState,
  saveMarketSourceSyncState,
  type MarketSourcePendingUpdate,
  type MarketSourceSnapshot
} from '#~/shared/storage.js'

import type { ChromeExtensionRuntime } from './index.js'

export async function checkMarketSourceUpdatesOnStartup(runtime: ChromeExtensionRuntime): Promise<void> {
  const config = await runtime.getConfig()

  if (!config.marketAutoCheckUpdates || config.marketSources.length === 0) {
    await saveMarketSourceSyncState({
      snapshots: [],
      pendingUpdates: []
    })
    return
  }

  const previousState = await loadMarketSourceSyncState()
  const previousSnapshotByUrl = new Map(
    previousState.snapshots.map((snapshot) => [snapshot.sourceUrl, snapshot])
  )
  const previousPendingKeys = new Set(
    previousState.pendingUpdates.map((update) => `${update.sourceUrl}:${update.version}:${update.checkedAt}`)
  )
  const results = await Promise.all(config.marketSources.map((source) => fetchMarketCatalog(source)))
  const checkedAt = new Date().toISOString()
  const snapshots: MarketSourceSnapshot[] = []
  const pendingUpdates: MarketSourcePendingUpdate[] = []
  let shouldNotify = false

  for (const result of results) {
    const previousSnapshot = previousSnapshotByUrl.get(result.source.url)

    if (result.error) {
      if (previousSnapshot) {
        snapshots.push(previousSnapshot)
      }
      continue
    }

    const digest = createMarketCatalogDigest(result)
    const snapshot: MarketSourceSnapshot = {
      sourceId: result.source.id,
      sourceUrl: result.source.url,
      title: result.title,
      version: result.version,
      digest,
      checkedAt,
      clientCount: result.clients.length
    }

    snapshots.push(snapshot)

    if (previousSnapshot && previousSnapshot.digest !== digest) {
      const pendingUpdate: MarketSourcePendingUpdate = {
        sourceId: result.source.id,
        sourceUrl: result.source.url,
        title: result.title,
        version: result.version,
        checkedAt
      }
      pendingUpdates.push(pendingUpdate)

      if (!previousPendingKeys.has(`${pendingUpdate.sourceUrl}:${pendingUpdate.version}:${pendingUpdate.checkedAt}`)) {
        shouldNotify = true
      }
    }
  }

  await saveMarketSourceSyncState({
    lastCheckedAt: checkedAt,
    snapshots,
    pendingUpdates
  })

  if (shouldNotify && pendingUpdates.length > 0) {
    await runtime.showNotification({
      message:
        pendingUpdates.length === 1
          ? `${pendingUpdates[0].title} has market updates. Open Market to review.`
          : `${pendingUpdates.length} market sources changed. Open Market to review updates.`
    })
  }
}
