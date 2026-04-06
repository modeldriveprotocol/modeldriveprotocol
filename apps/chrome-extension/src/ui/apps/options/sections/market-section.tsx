import {
  Collapse,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

import type { MarketSourceConfig, RouteClientConfig } from '#~/shared/config.js'
import type { PopupState } from '#~/background/shared.js'
import { useI18n } from '../../../i18n/provider.js'
import {
  countInstalledMarketClients,
  fetchMarketCatalog,
  type MarketCatalogClientEntry,
  type MarketCatalogSourceData,
  type MarketCatalogSourceResult
} from '../../../market/catalog.js'
import type { MarketSourceDraftInput } from '../types.js'
import { MarketDetailView } from './market-section/detail-view.js'
import { MarketEntryRow } from './market-section/entry-row.js'
import { MarketSourcesPanel } from './market-section/sources-panel.js'
import { MarketToolbar } from './market-section/toolbar.js'
import type { MarketEntryItem } from './market-section/types.js'

export function MarketSection({
  marketDetailOpen,
  marketSources,
  marketUpdates,
  routeClients,
  selectedEntryKey,
  onAddSource,
  onDetailTitleChange,
  onOpenDetail,
  onInstall,
  onRemoveSource
}: {
  marketDetailOpen: boolean
  marketSources: MarketSourceConfig[]
  marketUpdates?: PopupState['marketUpdates']
  routeClients: RouteClientConfig[]
  selectedEntryKey?: string
  onAddSource: (input: MarketSourceDraftInput) => Promise<void>
  onDetailTitleChange: (title: string | undefined) => void
  onOpenDetail: (entryKey: string) => void
  onInstall: (catalog: MarketCatalogSourceData, entry: MarketCatalogClientEntry) => void
  onRemoveSource: (sourceId: string) => void
}) {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [controlsExpanded, setControlsExpanded] = useState(
    marketSources.length === 0
  )
  const [catalogs, setCatalogs] = useState<MarketCatalogSourceResult[]>([])
  const [loadingCatalogs, setLoadingCatalogs] = useState(false)

  useEffect(() => {
    if (marketSources.length === 0) {
      setControlsExpanded(true)
    }
  }, [marketSources.length])

  useEffect(() => {
    let cancelled = false
    async function loadCatalogs() {
      if (marketSources.length === 0) {
        setCatalogs([])
        return
      }
      setLoadingCatalogs(true)
      try {
        const nextCatalogs = await Promise.all(marketSources.map((source) => fetchMarketCatalog(source)))
        if (!cancelled) {
          setCatalogs(nextCatalogs)
        }
      } finally {
        if (!cancelled) {
          setLoadingCatalogs(false)
        }
      }
    }
    void loadCatalogs()
    return () => {
      cancelled = true
    }
  }, [marketSources, refreshKey])

  const marketEntries = useMemo<MarketEntryItem[]>(() => {
    const keyword = search.trim().toLowerCase()
    return catalogs
      .flatMap((catalog) =>
        catalog.clients.map((entry) => {
          const localCount = countInstalledMarketClients(routeClients, catalog.source.url, entry.id)
          const haystack = [entry.title, entry.summary, catalog.title, catalog.source.url, ...entry.tags].join(' ').toLowerCase()
          return { key: `${catalog.source.id}:${entry.id}`, catalog, entry, localCount, visible: keyword.length === 0 || haystack.includes(keyword) }
        })
      )
      .filter((item) => item.visible)
  }, [catalogs, routeClients, search])

  const selectedMarketEntry = marketEntries.find((item) => item.key === selectedEntryKey) ?? marketEntries[0]

  useEffect(() => {
    onDetailTitleChange(
      marketDetailOpen ? selectedMarketEntry?.entry.title : undefined
    )
  }, [marketDetailOpen, onDetailTitleChange, selectedMarketEntry?.entry.title])

  return (
    marketDetailOpen ? (
      <MarketDetailView
        item={selectedMarketEntry}
        onInstall={() => {
          if (selectedMarketEntry) {
            onInstall(selectedMarketEntry.catalog, selectedMarketEntry.entry)
          }
        }}
        t={t}
      />
    ) : (
      <Stack spacing={0}>
        <MarketToolbar
          controlsExpanded={controlsExpanded}
          loading={loadingCatalogs}
          pendingUpdateCount={marketUpdates?.pendingUpdateCount ?? 0}
          search={search}
          onRefresh={() => setRefreshKey((value) => value + 1)}
          onSearchChange={setSearch}
          onToggleControlsExpanded={() =>
            setControlsExpanded((current) => !current)
          }
          t={t}
        />

        <Collapse in={controlsExpanded} timeout="auto" unmountOnExit>
          <MarketSourcesPanel
            catalogs={catalogs}
            marketSources={marketSources}
            onAddSource={onAddSource}
            onRemoveSource={onRemoveSource}
            t={t}
          />
        </Collapse>

        <Divider sx={{ mt: 0.75, mb: 0.75 }} />

        <List dense disablePadding sx={{ py: 0.5 }}>
          {loadingCatalogs ? (
            <ListItem disablePadding sx={{ px: 1.25, py: 1.5 }}>
              <ListItemText
                primary={t('options.loadingWorkspace')}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          ) : marketEntries.length === 0 ? (
            <ListItem disablePadding sx={{ px: 1.25, py: 1.5 }}>
              <ListItemText
                primary={t('options.market.emptyResults')}
                secondary={t('options.market.emptyResultsHint')}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ) : (
            marketEntries.map((item) => (
              <MarketEntryRow
                key={item.key}
                item={item}
                onInstall={() => onInstall(item.catalog, item.entry)}
                onOpenDetail={() => onOpenDetail(item.key)}
                t={t}
              />
            ))
          )}
        </List>
      </Stack>
    )
  )
}
