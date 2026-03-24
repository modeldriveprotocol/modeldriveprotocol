import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined'
import DownloadOutlined from '@mui/icons-material/DownloadOutlined'
import FileUploadOutlined from '@mui/icons-material/FileUploadOutlined'
import SaveOutlined from '@mui/icons-material/SaveOutlined'
import {
  Button,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'
import { useMemo } from 'react'

import type { MarketSourceProvider, MarketSourceRefType } from '#~/shared/config.js'
import { useI18n } from '../../../i18n/provider.js'
import { WorkspaceBundleEditor } from '../../../workspace-bundle/editor.js'
import { summarizeWorkspaceBundleText } from '../../../workspace-bundle/bundle.js'
import { SectionPanel, ToolbarIcon } from '../shared.js'
import type { ImportSourceDraftInput, TransferMode } from '../types.js'

export function ImportsSection({
  importInputRef,
  transferDraft,
  transferMode,
  transferProvider,
  transferRef,
  transferRefType,
  transferRepository,
  transferSourceMode,
  transferUrl,
  onTransferDraftChange,
  onTransferProviderChange,
  onTransferRefChange,
  onTransferRefTypeChange,
  onTransferRepositoryChange,
  onTransferSourceModeChange,
  onTransferModeChange,
  onCopy,
  onDownload,
  onExport,
  onFetchImport,
  onUpload,
  onApplyImport,
  onReadImportFile,
  onTransferUrlChange
}: {
  importInputRef: React.RefObject<HTMLInputElement | null>
  transferDraft: string
  transferMode: TransferMode
  transferProvider: MarketSourceProvider
  transferRef: string
  transferRefType: MarketSourceRefType
  transferRepository: string
  transferSourceMode: 'direct' | 'repository'
  transferUrl: string
  onTransferDraftChange: (value: string) => void
  onTransferProviderChange: (value: MarketSourceProvider) => void
  onTransferRefChange: (value: string) => void
  onTransferRefTypeChange: (value: MarketSourceRefType) => void
  onTransferRepositoryChange: (value: string) => void
  onTransferSourceModeChange: (value: 'direct' | 'repository') => void
  onTransferModeChange: (mode: TransferMode) => void
  onCopy: () => void
  onDownload: () => void
  onExport: () => void
  onFetchImport: (input: ImportSourceDraftInput) => void
  onUpload: () => void
  onApplyImport: () => void
  onReadImportFile: (file: File | undefined) => void
  onTransferUrlChange: (value: string) => void
}) {
  const { t } = useI18n()
  const parsedTransferSummary = useMemo(() => summarizeWorkspaceBundleText(transferDraft), [transferDraft])

  return (
    <SectionPanel
      title={t('options.imports.title')}
      description={t('options.imports.description')}
      icon={<DownloadOutlined fontSize="small" />}
      action={
        <Stack direction="row" spacing={0.5}>
          <ToolbarIcon label={t('options.imports.copy')} onClick={() => onCopy()}>
            <ContentCopyOutlined fontSize="small" />
          </ToolbarIcon>
          <ToolbarIcon label={t('options.imports.download')} onClick={() => onDownload()}>
            <DownloadOutlined fontSize="small" />
          </ToolbarIcon>
          <ToolbarIcon label={t('options.imports.export')} onClick={() => onExport()}>
            <SaveOutlined fontSize="small" />
          </ToolbarIcon>
          <ToolbarIcon label={t('options.imports.upload')} onClick={() => onUpload()}>
            <FileUploadOutlined fontSize="small" />
          </ToolbarIcon>
        </Stack>
      }
    >
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Tabs value={transferMode} onChange={(_event, next) => onTransferModeChange(next)} variant="standard">
            <Tab value="export" label={t('options.imports.export')} />
            <Tab value="import" label={t('options.imports.import')} />
          </Tabs>
          {transferMode === 'import' ? (
            <ToolbarIcon label={t('options.imports.apply')} onClick={() => onApplyImport()}>
              <SaveOutlined fontSize="small" />
            </ToolbarIcon>
          ) : null}
        </Stack>
        {transferMode === 'import' ? (
          <Stack spacing={1}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={transferSourceMode}
              onChange={(_event, nextValue: 'direct' | 'repository' | null) => {
                if (nextValue) {
                  onTransferSourceModeChange(nextValue)
                }
              }}
            >
              <ToggleButton value="direct">{t('options.imports.sourceMode.direct')}</ToggleButton>
              <ToggleButton value="repository">{t('options.imports.sourceMode.repository')}</ToggleButton>
            </ToggleButtonGroup>

            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1}>
              {transferSourceMode === 'direct' ? (
                <TextField
                  fullWidth
                  size="small"
                  label={t('options.imports.url')}
                  value={transferUrl}
                  onChange={(event) => onTransferUrlChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      onFetchImport({ mode: 'direct', url: transferUrl })
                    }
                  }}
                />
              ) : (
                <>
                  <TextField
                    select
                    size="small"
                    label={t('options.imports.provider')}
                    value={transferProvider}
                    onChange={(event) => onTransferProviderChange(event.target.value as MarketSourceProvider)}
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="github">GitHub</MenuItem>
                    <MenuItem value="gitlab">GitLab</MenuItem>
                  </TextField>
                  <TextField fullWidth size="small" label={t('options.imports.repository')} value={transferRepository} onChange={(event) => onTransferRepositoryChange(event.target.value)} />
                  <TextField
                    select
                    size="small"
                    label={t('options.imports.refType')}
                    value={transferRefType}
                    onChange={(event) => onTransferRefTypeChange(event.target.value as MarketSourceRefType)}
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="branch">{t('options.imports.refType.branch')}</MenuItem>
                    <MenuItem value="tag">{t('options.imports.refType.tag')}</MenuItem>
                    <MenuItem value="commit">{t('options.imports.refType.commit')}</MenuItem>
                  </TextField>
                  <TextField
                    size="small"
                    label={t('options.imports.ref')}
                    value={transferRef}
                    onChange={(event) => onTransferRefChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        onFetchImport({
                          mode: 'repository',
                          provider: transferProvider,
                          repository: transferRepository,
                          refType: transferRefType,
                          ref: transferRef
                        })
                      }
                    }}
                    sx={{ minWidth: 140 }}
                  />
                </>
              )}
              <Button
                variant="outlined"
                onClick={() =>
                  onFetchImport(
                    transferSourceMode === 'direct'
                      ? { mode: 'direct', url: transferUrl }
                      : {
                          mode: 'repository',
                          provider: transferProvider,
                          repository: transferRepository,
                          refType: transferRefType,
                          ref: transferRef
                        }
                  )
                }
              >
                {t('options.imports.fetch')}
              </Button>
            </Stack>
          </Stack>
        ) : null}
        <Typography variant="caption" color={parsedTransferSummary.valid ? 'text.secondary' : 'error.main'}>
          {parsedTransferSummary.valid
            ? [
                ...(parsedTransferSummary.version ? [t('options.imports.summaryVersion', { version: parsedTransferSummary.version })] : []),
                `${t('options.imports.summaryRoutes', { count: parsedTransferSummary.routeClients })}`,
                parsedTransferSummary.backgroundEnabled ? t('options.imports.summaryBackgroundOn') : t('options.imports.summaryBackgroundOff')
              ].join(' · ')
            : t('options.imports.summaryInvalid')}
        </Typography>
        <WorkspaceBundleEditor ariaLabel={t('options.imports.title')} minHeight={360} value={transferDraft} onChange={onTransferDraftChange} />
        <input ref={importInputRef} hidden type="file" accept="application/json,.json" onChange={(event) => onReadImportFile(event.target.files?.[0])} />
      </Stack>
    </SectionPanel>
  )
}
