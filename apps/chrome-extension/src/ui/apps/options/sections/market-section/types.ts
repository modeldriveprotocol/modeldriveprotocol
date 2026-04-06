import type {
  MarketCatalogClientEntry,
  MarketCatalogSourceResult
} from '../../../../market/catalog.js'
import type { MarketSourceConfig } from '#~/shared/config.js'

export type MarketEntryItem = {
  key: string
  catalog: MarketCatalogSourceResult
  entry: MarketCatalogClientEntry
  localCount: number
}

export type MarketSourceSummary =
  | MarketCatalogSourceResult
  | {
      source: MarketSourceConfig
      title: string
      version: string
      compatible: boolean
      clients: []
    }
