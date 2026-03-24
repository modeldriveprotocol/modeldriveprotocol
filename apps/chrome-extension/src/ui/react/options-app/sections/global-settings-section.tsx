import HubOutlined from '@mui/icons-material/HubOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined'
import { Box, FormControlLabel, MenuItem, Stack, Switch, TextField } from '@mui/material'

import type { ExtensionConfig, MarketSourceProvider, MarketSourceRefType } from '#~/shared/config.js'
import type { AppearancePreference } from '../../appearance.js'
import type { LocalePreference } from '../../i18n.js'
import { useI18n } from '../../i18n.js'
import { SectionPanel } from '../shared.js'
import type { ImportSourceDraftInput, TransferMode } from '../types.js'
import { ImportsSection } from './imports-section.js'

export function GlobalSettingsSection({
  appearancePreference,
  draft,
  importInputRef,
  localePreference,
  transferDraft,
  transferMode,
  transferProvider,
  transferRef,
  transferRefType,
  transferRepository,
  transferSourceMode,
  transferUrl,
  onChange,
  onMarketAutoCheckChange,
  onAppearancePreferenceChange,
  onApplyImport,
  onCopy,
  onDownload,
  onExport,
  onFetchImport,
  onLocalePreferenceChange,
  onReadImportFile,
  onTransferDraftChange,
  onTransferProviderChange,
  onTransferRefChange,
  onTransferRefTypeChange,
  onTransferRepositoryChange,
  onTransferSourceModeChange,
  onTransferModeChange,
  onTransferUrlChange,
  onUpload
}: {
  appearancePreference: AppearancePreference
  draft: ExtensionConfig
  importInputRef: React.RefObject<HTMLInputElement | null>
  localePreference: LocalePreference
  transferDraft: string
  transferMode: TransferMode
  transferProvider: MarketSourceProvider
  transferRef: string
  transferRefType: MarketSourceRefType
  transferRepository: string
  transferSourceMode: 'direct' | 'repository'
  transferUrl: string
  onChange: (config: ExtensionConfig) => void
  onMarketAutoCheckChange: (nextValue: boolean) => void
  onAppearancePreferenceChange: (next: AppearancePreference) => Promise<void>
  onApplyImport: () => void
  onCopy: () => void
  onDownload: () => void
  onExport: () => void
  onFetchImport: (input: ImportSourceDraftInput) => void
  onLocalePreferenceChange: (next: LocalePreference) => Promise<void>
  onReadImportFile: (file: File | undefined) => void
  onTransferDraftChange: (value: string) => void
  onTransferProviderChange: (value: MarketSourceProvider) => void
  onTransferRefChange: (value: string) => void
  onTransferRefTypeChange: (value: MarketSourceRefType) => void
  onTransferRepositoryChange: (value: string) => void
  onTransferSourceModeChange: (value: 'direct' | 'repository') => void
  onTransferModeChange: (mode: TransferMode) => void
  onTransferUrlChange: (value: string) => void
  onUpload: () => void
}) {
  const { t } = useI18n()
  const settingsFieldLayout = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    pt: 1,
    gap: 1.25
  } as const

  return (
    <Stack spacing={1.5}>
      <SectionPanel
        title={t('options.workspace.appearanceSection.title')}
        description={t('options.workspace.appearanceSection.description')}
        icon={<SettingsOutlined fontSize="small" />}
      >
        <Box sx={settingsFieldLayout}>
          <TextField size="small" select label={t('options.workspace.language')} value={localePreference} onChange={(event) => void onLocalePreferenceChange(event.target.value as LocalePreference)}>
            <MenuItem value="auto">{t('options.locale.auto')}</MenuItem>
            <MenuItem value="en">{t('options.locale.en')}</MenuItem>
            <MenuItem value="zh-CN">{t('options.locale.zh-CN')}</MenuItem>
          </TextField>
          <TextField size="small" select label={t('options.workspace.appearance')} value={appearancePreference} onChange={(event) => void onAppearancePreferenceChange(event.target.value as AppearancePreference)}>
            <MenuItem value="auto">{t('options.appearance.auto')}</MenuItem>
            <MenuItem value="light">{t('options.appearance.light')}</MenuItem>
            <MenuItem value="dark">{t('options.appearance.dark')}</MenuItem>
          </TextField>
        </Box>
      </SectionPanel>

      <SectionPanel title={t('options.workspace.defaultClient.title')} description={t('options.workspace.defaultClient.description')} icon={<HubOutlined fontSize="small" />}>
        <Box sx={settingsFieldLayout}>
          <TextField size="small" label={t('options.workspace.serverUrl')} value={draft.serverUrl} onChange={(event) => onChange({ ...draft, serverUrl: event.target.value })} />
          <TextField size="small" label={t('options.workspace.notificationTitle')} value={draft.notificationTitle} onChange={(event) => onChange({ ...draft, notificationTitle: event.target.value })} />
        </Box>
      </SectionPanel>

      <SectionPanel title={t('options.market.settingsTitle')} description={t('options.market.settingsDescription')} icon={<StorefrontOutlined fontSize="small" />}>
        <FormControlLabel control={<Switch checked={draft.marketAutoCheckUpdates} onChange={(_event, checked) => onMarketAutoCheckChange(checked)} />} label={t('options.market.autoCheck')} />
      </SectionPanel>

      <ImportsSection
        importInputRef={importInputRef}
        transferDraft={transferDraft}
        transferMode={transferMode}
        transferProvider={transferProvider}
        transferRef={transferRef}
        transferRefType={transferRefType}
        transferRepository={transferRepository}
        transferSourceMode={transferSourceMode}
        transferUrl={transferUrl}
        onApplyImport={onApplyImport}
        onCopy={onCopy}
        onDownload={onDownload}
        onExport={onExport}
        onFetchImport={onFetchImport}
        onReadImportFile={onReadImportFile}
        onTransferDraftChange={onTransferDraftChange}
        onTransferProviderChange={onTransferProviderChange}
        onTransferRefChange={onTransferRefChange}
        onTransferRefTypeChange={onTransferRefTypeChange}
        onTransferRepositoryChange={onTransferRepositoryChange}
        onTransferSourceModeChange={onTransferSourceModeChange}
        onTransferModeChange={onTransferModeChange}
        onTransferUrlChange={onTransferUrlChange}
        onUpload={onUpload}
      />
    </Stack>
  )
}
