import {
  Button,
  Collapse,
  Divider,
  List,
  ListItem,
  Stack,
  Typography
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'

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
  onCloseDetail,
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
  onCloseDetail: () => void
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
  const [highlightedEntryKey, setHighlightedEntryKey] = useState<string>()
  const highlightedEntryKeyRef = useRef<string | undefined>(undefined)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  function updateHighlightedEntryKey(nextKey: string | undefined) {
    highlightedEntryKeyRef.current = nextKey
    setHighlightedEntryKey(nextKey)
  }

  useEffect(() => {
    if (marketSources.length === 0) {
      setControlsExpanded(true)
    }
  }, [marketSources.length])

  useEffect(() => {
    if (marketDetailOpen) {
      function onWindowKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape' && !event.metaKey && !event.ctrlKey && !event.altKey) {
          event.preventDefault()
          onCloseDetail()
        }
      }

      window.addEventListener('keydown', onWindowKeyDown)
      return () => {
        window.removeEventListener('keydown', onWindowKeyDown)
      }
    }

    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) {
        return false
      }

      return (
        target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      )
    }

    function focusSearch() {
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    }

    function onWindowKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) {
        return
      }

      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        focusSearch()
        return
      }

      if (
        event.key.toLowerCase() === 'k' &&
        (event.metaKey || event.ctrlKey) &&
        !event.altKey
      ) {
        event.preventDefault()
        focusSearch()
      }
    }

    window.addEventListener('keydown', onWindowKeyDown)
    return () => {
      window.removeEventListener('keydown', onWindowKeyDown)
    }
  }, [marketDetailOpen, onCloseDetail])

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
  const highlightedMarketEntry =
    marketEntries.find((item) => item.key === highlightedEntryKey) ??
    marketEntries[0]
  const toolbarStatusText = search.trim()
    ? t('options.market.resultsFilteredSummary', {
        count: marketEntries.length,
        query: search.trim(),
        sourceCount: marketSources.length
      })
    : t('options.market.resultsSummary', {
        clientCount: marketEntries.length,
        sourceCount: marketSources.length
      })
  const toolbarShortcutText = marketEntries.length > 0
    ? t('options.market.searchShortcutWithSelection')
    : t('options.market.searchShortcut')

  useEffect(() => {
    if (marketEntries.length === 0) {
      updateHighlightedEntryKey(undefined)
      return
    }

    const currentKey = highlightedEntryKeyRef.current
    const nextKey =
      currentKey && marketEntries.some((item) => item.key === currentKey)
        ? currentKey
        : marketEntries[0]?.key

    updateHighlightedEntryKey(nextKey)
  }, [marketEntries])

  function moveHighlightedEntry(direction: 1 | -1) {
    if (marketEntries.length === 0) {
      return
    }

    const currentIndex = highlightedMarketEntry
      ? marketEntries.findIndex((item) => item.key === highlightedMarketEntry.key)
      : 0
    const safeIndex = currentIndex < 0 ? 0 : currentIndex
    const nextIndex =
      (safeIndex + direction + marketEntries.length) % marketEntries.length

    updateHighlightedEntryKey(marketEntries[nextIndex]?.key)
  }

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
          searchInputRef={searchInputRef}
          statusText={toolbarStatusText}
          shortcutText={toolbarShortcutText}
          onRefresh={() => setRefreshKey((value) => value + 1)}
          onSearchChange={setSearch}
          onSelectNextResult={() => moveHighlightedEntry(1)}
          onSelectPreviousResult={() => moveHighlightedEntry(-1)}
          onSubmitSearch={
            marketEntries.length > 0
              ? () => {
                  const entryKey =
                    highlightedEntryKeyRef.current &&
                    marketEntries.some(
                      (item) => item.key === highlightedEntryKeyRef.current
                    )
                      ? highlightedEntryKeyRef.current
                      : marketEntries[0]?.key

                  if (entryKey) {
                    onOpenDetail(entryKey)
                  }
                }
              : undefined
          }
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
              <Typography variant="body2" color="text.secondary">
                {t('options.loadingWorkspace')}
              </Typography>
            </ListItem>
          ) : marketEntries.length === 0 ? (
            <ListItem disablePadding sx={{ px: 1.25, py: 1.5 }}>
              <Stack spacing={0.75} alignItems="flex-start">
                <Typography variant="body2">
                  {t('options.market.emptyResults')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('options.market.emptyResultsHint')}
                </Typography>
                {search.trim() || !controlsExpanded ? (
                  <Stack direction="row" spacing={0.75}>
                    {search.trim() ? (
                      <Button
                        size="small"
                        onClick={() => setSearch('')}
                        sx={{ minWidth: 0, px: 0.75 }}
                      >
                        {t('options.market.clearSearch')}
                      </Button>
                    ) : null}
                    {!controlsExpanded ? (
                      <Button
                        size="small"
                        onClick={() => setControlsExpanded(true)}
                        sx={{ minWidth: 0, px: 0.75 }}
                      >
                        {t('options.market.showSources')}
                      </Button>
                    ) : null}
                  </Stack>
                ) : null}
              </Stack>
            </ListItem>
          ) : (
            marketEntries.map((item) => (
              <MarketEntryRow
                active={item.key === highlightedMarketEntry?.key}
                key={item.key}
                item={item}
                onActivate={() => updateHighlightedEntryKey(item.key)}
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
