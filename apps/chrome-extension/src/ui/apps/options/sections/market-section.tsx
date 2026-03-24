import CloseOutlined from '@mui/icons-material/CloseOutlined'
import RefreshOutlined from '@mui/icons-material/RefreshOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

import type { MarketSourceConfig, RouteClientConfig } from '#~/shared/config.js'
import type { PopupState } from '#~/background/shared.js'
import { renderClientIcon } from '../../../foundation/client-icons.js'
import { useI18n } from '../../../i18n/provider.js'
import { countInstalledMarketClients, fetchMarketCatalog, type MarketCatalogClientEntry, type MarketCatalogSourceData, type MarketCatalogSourceResult } from '../../../market/catalog.js'
import { SectionPanel, ToolbarIcon } from '../shared.js'
import type { MarketSourceDraftInput } from '../types.js'
import { MarketSourcesDialog } from './market-sources-dialog.js'

export function MarketSection({
  marketDetailOpen,
  marketSources,
  marketUpdates,
  routeClients,
  selectedEntryKey,
  onAddSource,
  onCloseDetail,
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
  onOpenDetail: (entryKey: string) => void
  onInstall: (catalog: MarketCatalogSourceData, entry: MarketCatalogClientEntry) => void
  onRemoveSource: (sourceId: string) => void
}) {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [catalogs, setCatalogs] = useState<MarketCatalogSourceResult[]>([])
  const [loadingCatalogs, setLoadingCatalogs] = useState(false)

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

  const marketEntries = useMemo(() => {
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

  return (
    <SectionPanel title={t('options.market.title')} description={t('options.market.description')} icon={<SettingsOutlined fontSize="small" />}>
      <Stack spacing={1.25}>
        {marketUpdates?.pendingUpdateCount ? <Typography variant="caption" color="text.secondary">{t('options.market.pendingUpdates', { count: marketUpdates.pendingUpdateCount })}</Typography> : null}
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField fullWidth size="small" placeholder={t('options.market.search')} value={search} onChange={(event) => setSearch(event.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" /></InputAdornment> }} />
          <ToolbarIcon label={t('options.nav.settings')} onClick={() => setSettingsOpen(true)}><SettingsOutlined fontSize="small" /></ToolbarIcon>
        </Stack>

        {marketDetailOpen ? (
          selectedMarketEntry ? (
            <Stack spacing={1.25}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Button size="small" variant="text" onClick={onCloseDetail} sx={{ px: 0 }}>{t('options.clients.backToList')}</Button>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>{selectedMarketEntry.entry.title}</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                  <Box sx={{ color: 'primary.main', display: 'grid', placeItems: 'center' }}>{renderClientIcon(selectedMarketEntry.entry.icon)}</Box>
                  <Typography variant="body2" color="text.secondary">{selectedMarketEntry.entry.summary || t('options.market.noSummary')}</Typography>
                </Stack>
                <Button variant="contained" onClick={() => onInstall(selectedMarketEntry.catalog, selectedMarketEntry.entry)}>
                  {selectedMarketEntry.localCount > 0 ? t('options.market.installAgain') : t('options.market.install')}
                </Button>
              </Stack>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">{t('options.market.source')}</Typography>
                <Typography variant="body2">{selectedMarketEntry.catalog.title}</Typography>
                <Typography variant="caption" color="text.secondary">{[`${t('options.market.version')}: ${selectedMarketEntry.catalog.version}`, t('options.market.relatedLocalClients', { count: selectedMarketEntry.localCount })].join(' · ')}</Typography>
              </Stack>
              <Divider />
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">{t('options.market.previewClient')}</Typography>
                <Typography variant="body2">{selectedMarketEntry.entry.template.clientName}</Typography>
                <Typography variant="body2" color="text.secondary">{selectedMarketEntry.entry.template.clientDescription || t('options.market.noSummary')}</Typography>
              </Stack>
            </Stack>
          ) : <Typography variant="body2" color="text.secondary">{t('options.market.noSelection')}</Typography>
        ) : (
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">{t('options.market.results')}</Typography>
            {loadingCatalogs ? (
              <Typography variant="body2" color="text.secondary">{t('options.loadingWorkspace')}</Typography>
            ) : marketEntries.length === 0 ? (
              <Stack spacing={0.25}>
                <Typography variant="body2" color="text.secondary">{t('options.market.emptyResults')}</Typography>
                <Typography variant="caption" color="text.secondary">{t('options.market.emptyResultsHint')}</Typography>
              </Stack>
            ) : (
              <List disablePadding>
                {marketEntries.map((item) => (
                  <ListItem key={item.key} disablePadding>
                    <ListItemButton onClick={() => onOpenDetail(item.key)}>
                      <ListItemIcon sx={{ minWidth: 34 }}>{renderClientIcon(item.entry.icon)}</ListItemIcon>
                      <ListItemText primary={item.entry.title} secondary={[item.catalog.title, t('options.market.localClients', { count: item.localCount })].join(' · ')} primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }} secondaryTypographyProps={{ variant: 'caption', noWrap: true }} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Stack>
        )}
      </Stack>

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t('options.market.sources')}</Typography>
          <Stack direction="row" spacing={0.5}>
            <ToolbarIcon label={t('options.market.refreshSources')} onClick={() => setRefreshKey((value) => value + 1)}><RefreshOutlined fontSize="small" /></ToolbarIcon>
            <ToolbarIcon label={t('common.close')} onClick={() => setSettingsOpen(false)}><CloseOutlined fontSize="small" /></ToolbarIcon>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <MarketSourcesDialog marketSources={marketSources} catalogs={catalogs} onAddSource={onAddSource} onRemoveSource={onRemoveSource} />
        </DialogContent>
      </Dialog>
    </SectionPanel>
  )
}
