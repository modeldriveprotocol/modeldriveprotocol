import type {
  MarketCatalogClientEntry,
  MarketCatalogSourceData,
  MarketCatalogSourceResult
} from '#~/shared/market-catalog.js'
import { DEFAULT_EXTENSION_CONFIG, type RouteClientConfig, normalizeConfig } from '#~/shared/config.js'
import { createStableId } from '#~/shared/utils.js'

export {
  fetchMarketCatalog,
  formatCatalogError,
  normalizeCatalogSourceTitle,
  type MarketCatalogClientEntry,
  type MarketCatalogSourceData,
  type MarketCatalogSourceResult
} from '#~/shared/market-catalog.js'

export function countInstalledMarketClients(
  localClients: RouteClientConfig[],
  sourceUrl: string,
  marketClientId: string
): number {
  return localClients.filter(
    (client) =>
      client.installSource?.type === 'market' &&
      client.installSource.sourceUrl === sourceUrl &&
      client.installSource.marketClientId === marketClientId
  ).length
}

export function createInstalledMarketClient(options: {
  catalog: MarketCatalogSourceData
  entry: MarketCatalogClientEntry
  existingCount: number
}): RouteClientConfig {
  const suffix = options.existingCount + 1
  const clientName =
    suffix > 1 ? `${options.entry.template.clientName} (${suffix})` : options.entry.template.clientName
  const baseClientId = createStableId('mdp-market-client', `${options.catalog.source.url}-${options.entry.id}`)
  const clientId = suffix > 1 ? `${baseClientId}-${suffix}` : baseClientId

  return normalizeConfig({
    ...DEFAULT_EXTENSION_CONFIG,
    routeClients: [
      {
        ...options.entry.template,
        id: createStableId('market-install', `${clientId}-${Date.now()}-${Math.random()}`),
        clientId,
        clientName,
        installSource: {
          type: 'market',
          sourceId: options.catalog.source.id,
          sourceUrl: options.catalog.source.url,
          marketClientId: options.entry.id,
          marketVersion: options.catalog.version,
          installedAt: new Date().toISOString()
        }
      }
    ]
  }).routeClients[0]
}
