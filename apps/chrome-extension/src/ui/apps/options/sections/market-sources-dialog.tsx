import AddOutlined from '@mui/icons-material/AddOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import SaveOutlined from '@mui/icons-material/SaveOutlined'
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'
import { useMemo, useState } from 'react'

import type { MarketSourceConfig, MarketSourceProvider, MarketSourceRefType } from '#~/shared/config.js'
import type { MarketCatalogSourceResult } from '../../../market/catalog.js'
import { useI18n } from '../../../i18n/provider.js'
import { ToolbarIcon } from '../shared.js'
import type { MarketSourceDraftInput } from '../types.js'

export function MarketSourcesDialog({
  catalogs,
  marketSources,
  onAddSource,
  onRemoveSource
}: {
  catalogs: MarketCatalogSourceResult[]
  marketSources: MarketSourceConfig[]
  onAddSource: (input: MarketSourceDraftInput) => Promise<void>
  onRemoveSource: (sourceId: string) => void
}) {
  const { t } = useI18n()
  const [sourceMode, setSourceMode] = useState<'direct' | 'repository'>('direct')
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceProvider, setSourceProvider] = useState<MarketSourceProvider>('github')
  const [sourceRepository, setSourceRepository] = useState('')
  const [sourceRefType, setSourceRefType] = useState<MarketSourceRefType>('branch')
  const [sourceRef, setSourceRef] = useState('main')
  const [editingSourceId, setEditingSourceId] = useState<string>()

  async function submitSource() {
    if (sourceMode === 'direct') {
      const nextUrl = sourceUrl.trim()
      if (!nextUrl) return
      await onAddSource({ ...(editingSourceId ? { sourceId: editingSourceId } : {}), mode: 'direct', url: nextUrl })
      resetSourceEditor()
      return
    }

    if (!sourceRepository.trim() || !sourceRef.trim()) return
    await onAddSource({
      ...(editingSourceId ? { sourceId: editingSourceId } : {}),
      mode: 'repository',
      provider: sourceProvider,
      repository: sourceRepository,
      refType: sourceRefType,
      ref: sourceRef
    })
    resetSourceEditor()
  }

  function resetSourceEditor() {
    setEditingSourceId(undefined)
    setSourceMode('direct')
    setSourceUrl('')
    setSourceProvider('github')
    setSourceRepository('')
    setSourceRefType('branch')
    setSourceRef('main')
  }

  function startEditingSource(source: MarketSourceConfig) {
    setEditingSourceId(source.id)
    if (source.kind === 'repository' && source.provider && source.repository && source.refType && source.ref) {
      setSourceMode('repository')
      setSourceProvider(source.provider)
      setSourceRepository(source.repository)
      setSourceRefType(source.refType)
      setSourceRef(source.ref)
      setSourceUrl('')
      return
    }
    setSourceMode('direct')
    setSourceUrl(source.url)
    setSourceProvider('github')
    setSourceRepository('')
    setSourceRefType('branch')
    setSourceRef('main')
  }

  const sourceSummaries = useMemo(
    () =>
      marketSources.map((source) => {
        const matchedCatalog = catalogs.find((catalog) => catalog.source.id === source.id)
        return matchedCatalog ?? { source, title: source.url, version: '', compatible: true, clients: [] }
      }),
    [catalogs, marketSources]
  )

  return (
    <Stack spacing={1.25}>
      <ToggleButtonGroup exclusive size="small" value={sourceMode} onChange={(_event, nextValue) => nextValue && setSourceMode(nextValue)}>
        <ToggleButton value="direct">{t('options.market.sourceMode.direct')}</ToggleButton>
        <ToggleButton value="repository">{t('options.market.sourceMode.repository')}</ToggleButton>
      </ToggleButtonGroup>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
        {sourceMode === 'direct' ? (
          <TextField fullWidth size="small" label={t('options.market.sourceUrl')} value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void submitSource() } }} />
        ) : (
          <>
            <TextField select size="small" label={t('options.market.provider')} value={sourceProvider} onChange={(event) => setSourceProvider(event.target.value as MarketSourceProvider)} sx={{ minWidth: 120 }}>
              <MenuItem value="github">GitHub</MenuItem>
              <MenuItem value="gitlab">GitLab</MenuItem>
            </TextField>
            <TextField fullWidth size="small" label={t('options.market.repository')} value={sourceRepository} onChange={(event) => setSourceRepository(event.target.value)} />
            <TextField select size="small" label={t('options.market.refType')} value={sourceRefType} onChange={(event) => setSourceRefType(event.target.value as MarketSourceRefType)} sx={{ minWidth: 120 }}>
              <MenuItem value="branch">{t('options.market.refType.branch')}</MenuItem>
              <MenuItem value="tag">{t('options.market.refType.tag')}</MenuItem>
              <MenuItem value="commit">{t('options.market.refType.commit')}</MenuItem>
            </TextField>
            <TextField size="small" label={t('options.market.ref')} value={sourceRef} onChange={(event) => setSourceRef(event.target.value)} sx={{ minWidth: 140 }} />
          </>
        )}
        {editingSourceId ? <ToolbarIcon label={t('options.market.cancelEdit')} onClick={() => resetSourceEditor()}><CloseOutlined fontSize="small" /></ToolbarIcon> : null}
        <ToolbarIcon label={t(editingSourceId ? 'options.market.saveSource' : 'options.market.addSource')} onClick={() => void submitSource()}>
          {editingSourceId ? <SaveOutlined fontSize="small" /> : <AddOutlined fontSize="small" />}
        </ToolbarIcon>
      </Stack>

      {marketSources.length > 0 ? (
        <List disablePadding sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1 }}>
          {sourceSummaries.map((catalog) => (
            <ListItem
              key={catalog.source.id}
              disablePadding
              secondaryAction={
                <Stack direction="row" spacing={0.5}>
                  <ToolbarIcon label={t('options.market.editSource')} onClick={() => startEditingSource(catalog.source)}><EditOutlined fontSize="small" /></ToolbarIcon>
                  <ToolbarIcon label={t('options.market.removeSource')} onClick={() => onRemoveSource(catalog.source.id)}><DeleteOutlineOutlined fontSize="small" /></ToolbarIcon>
                </Stack>
              }
            >
              <ListItemButton sx={{ px: 0.5 }}>
                <ListItemText
                  primary={catalog.source.kind === 'repository' && catalog.source.repository && catalog.source.ref ? `${catalog.title} · ${catalog.source.repository}@${catalog.source.ref}` : catalog.title}
                  secondary={catalog.error ? catalog.error : [...(catalog.version ? [`${t('options.market.version')}: ${catalog.version}`] : []), catalog.compatible ? t('options.market.available') : t('options.market.incompatible'), t('options.market.sourceClients', { count: catalog.clients.length })].join(' · ')}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
                  secondaryTypographyProps={{ variant: 'caption', color: catalog.error ? 'error.main' : 'text.secondary' }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">{t('options.market.emptySources')}</Typography>
      )}
    </Stack>
  )
}
