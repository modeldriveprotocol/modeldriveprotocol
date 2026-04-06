import type {
  MarketCatalogClientEntry,
  MarketCatalogSourceResult
} from '../../../../market/catalog.js'

export type MarketEntryItem = {
  key: string
  catalog: MarketCatalogSourceResult
  entry: MarketCatalogClientEntry
  localCount: number
}
