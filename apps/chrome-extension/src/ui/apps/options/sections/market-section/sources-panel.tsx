import AddOutlined from '@mui/icons-material/AddOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import SaveOutlined from '@mui/icons-material/SaveOutlined'
import {
  List,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'

import type {
  MarketSourceConfig,
  MarketSourceProvider,
  MarketSourceRefType
} from '#~/shared/config.js'
import type { MarketCatalogSourceResult } from '../../../../market/catalog.js'
import { ToolbarIcon } from '../../shared.js'
import type { MarketSourceDraftInput } from '../../types.js'
import { MarketSourceRow } from './source-row.js'
import type { MarketSourceSummary } from './types.js'

export function MarketSourcesPanel({
  catalogs,
  marketSources,
  onAddSource,
  onRemoveSource,
  t
}: {
  catalogs: MarketCatalogSourceResult[]
  marketSources: MarketSourceConfig[]
  onAddSource: (input: MarketSourceDraftInput) => Promise<void>
  onRemoveSource: (sourceId: string) => void
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  const [sourceMode, setSourceMode] = useState<'direct' | 'repository'>('direct')
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceProvider, setSourceProvider] = useState<MarketSourceProvider>('github')
  const [sourceRepository, setSourceRepository] = useState('')
  const [sourceRefType, setSourceRefType] = useState<MarketSourceRefType>('branch')
  const [sourceRef, setSourceRef] = useState('main')
  const [editingSourceId, setEditingSourceId] = useState<string>()
  const directUrlInputRef = useRef<HTMLInputElement | null>(null)
  const repositoryInputRef = useRef<HTMLInputElement | null>(null)

  const sourceSummaries = useMemo<MarketSourceSummary[]>(
    () =>
      marketSources.map((source) => {
        const matchedCatalog = catalogs.find((catalog) => catalog.source.id === source.id)
        return matchedCatalog ?? {
          source,
          title: source.url,
          version: '',
          compatible: true,
          clients: []
        }
      }),
    [catalogs, marketSources]
  )
  const canSubmitSource =
    sourceMode === 'direct'
      ? sourceUrl.trim().length > 0
      : sourceRepository.trim().length > 0 && sourceRef.trim().length > 0

  useEffect(() => {
    if (sourceMode === 'direct') {
      directUrlInputRef.current?.focus()
      return
    }

    repositoryInputRef.current?.focus()
  }, [editingSourceId, sourceMode])

  async function submitSource() {
    if (sourceMode === 'direct') {
      const nextUrl = sourceUrl.trim()

      if (!nextUrl) {
        return
      }

      await onAddSource({
        ...(editingSourceId ? { sourceId: editingSourceId } : {}),
        mode: 'direct',
        url: nextUrl
      })
      resetSourceEditor()
      return
    }

    if (!sourceRepository.trim() || !sourceRef.trim()) {
      return
    }

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

    if (
      source.kind === 'repository' &&
      source.provider &&
      source.repository &&
      source.refType &&
      source.ref
    ) {
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

  return (
    <Stack spacing={1} sx={{ pt: 1 }}>
      <Typography variant="caption" color="text.secondary">
        {t('options.market.sources')}
      </Typography>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ sm: 'center' }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            if (canSubmitSource) {
              void submitSource()
            }
            return
          }

          if (event.key === 'Escape') {
            event.preventDefault()
            resetSourceEditor()
          }
        }}
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={sourceMode}
          onChange={(_event, nextValue) => {
            if (nextValue) {
              setSourceMode(nextValue)
            }
          }}
          sx={{
            flexShrink: 0,
            alignSelf: { xs: 'stretch', sm: 'auto' }
          }}
        >
          <ToggleButton value="direct">
            {t('options.market.sourceMode.direct')}
          </ToggleButton>
          <ToggleButton value="repository">
            {t('options.market.sourceMode.repository')}
          </ToggleButton>
        </ToggleButtonGroup>

        {sourceMode === 'direct' ? (
          <TextField
            fullWidth
            size="small"
            label={t('options.market.sourceUrl')}
            inputRef={directUrlInputRef}
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void submitSource()
              }
            }}
          />
        ) : (
          <>
            <TextField
              select
              size="small"
              label={t('options.market.provider')}
              value={sourceProvider}
              onChange={(event) =>
                setSourceProvider(event.target.value as MarketSourceProvider)
              }
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="github">GitHub</MenuItem>
              <MenuItem value="gitlab">GitLab</MenuItem>
            </TextField>
            <TextField
              fullWidth
              size="small"
              label={t('options.market.repository')}
              inputRef={repositoryInputRef}
              value={sourceRepository}
              onChange={(event) => setSourceRepository(event.target.value)}
            />
            <TextField
              select
              size="small"
              label={t('options.market.refType')}
              value={sourceRefType}
              onChange={(event) =>
                setSourceRefType(event.target.value as MarketSourceRefType)
              }
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="branch">{t('options.market.refType.branch')}</MenuItem>
              <MenuItem value="tag">{t('options.market.refType.tag')}</MenuItem>
              <MenuItem value="commit">{t('options.market.refType.commit')}</MenuItem>
            </TextField>
            <TextField
              size="small"
              label={t('options.market.ref')}
              value={sourceRef}
              onChange={(event) => setSourceRef(event.target.value)}
              sx={{ minWidth: 140 }}
            />
          </>
        )}
        {editingSourceId ? (
          <ToolbarIcon
            label={t('options.market.cancelEdit')}
            onClick={() => resetSourceEditor()}
          >
            <CloseOutlined fontSize="small" />
          </ToolbarIcon>
        ) : null}
        <ToolbarIcon
          label={t(
            editingSourceId
              ? 'options.market.saveSource'
              : 'options.market.addSource'
          )}
          disabled={!canSubmitSource}
          onClick={() => void submitSource()}
        >
          {editingSourceId ? (
            <SaveOutlined fontSize="small" />
          ) : (
            <AddOutlined fontSize="small" />
          )}
        </ToolbarIcon>
      </Stack>

      {sourceSummaries.length > 0 ? (
        <List dense disablePadding sx={{ py: 0.5 }}>
          {sourceSummaries.map((summary) => (
            <MarketSourceRow
              key={summary.source.id}
              summary={summary}
              onEdit={() => startEditingSource(summary.source)}
              onRemove={() => onRemoveSource(summary.source.id)}
              t={t}
            />
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t('options.market.emptySources')}
        </Typography>
      )}
    </Stack>
  )
}
