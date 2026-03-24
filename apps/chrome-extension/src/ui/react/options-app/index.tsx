import BrightnessAutoOutlined from '@mui/icons-material/BrightnessAutoOutlined'
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlined from '@mui/icons-material/LightModeOutlined'
import RouteOutlined from '@mui/icons-material/RouteOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import StorageOutlined from '@mui/icons-material/StorageOutlined'
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined'
import TranslateOutlined from '@mui/icons-material/TranslateOutlined'
import { Alert, Autocomplete, Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Snackbar, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'

import {
  createRouteClientConfig,
  type ExtensionConfig
} from '#~/shared/config.js'
import { createPresetRouteClient } from '../extension-api.js'
import { useAppearance } from '../appearance.js'
import { useI18n } from '../i18n.js'
import { GlobalSettingsSection } from './sections/global-settings-section.js'
import { ClientsSection } from './sections/clients-section.js'
import { MarketSection } from './sections/market-section.js'
import { WorkspaceSection } from './sections/workspace-section.js'
import { useOptionsController } from './use-options-controller.js'
import type { NavItem } from './types.js'

export function OptionsApp() {
  const { preference, setPreference, t } = useI18n()
  const { preference: appearancePreference, setPreference: setAppearancePreference } = useAppearance()
  const controller = useOptionsController(t)

  const navItems: NavItem[] = [
    { id: 'workspace', label: t('options.nav.workspace'), icon: <StorageOutlined fontSize="small" /> },
    { id: 'clients', label: t('options.nav.clients'), icon: <RouteOutlined fontSize="small" /> },
    { id: 'market', label: t('options.nav.market'), icon: <StorefrontOutlined fontSize="small" /> }
  ]

  if (controller.loading) {
    return <Alert severity="info">{t('options.loadingWorkspace')}</Alert>
  }
  if (!controller.draft) {
    return <Alert severity="error">{controller.error ?? t('options.loadFailed')}</Alert>
  }
  const draft = controller.draft as ExtensionConfig

  return (
    <Box sx={{ height: '100vh', display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '220px minmax(0, 1fr)' }, bgcolor: 'background.default', overflow: 'hidden' }}>
      <Box component="aside" sx={{ bgcolor: 'action.hover', height: '100vh', overflow: 'hidden' }}>
        <Box sx={{ height: '100%', display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr) auto' }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.5, py: 1.5, minHeight: 56, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box component="img" src={chrome.runtime.getURL('icons/icon-32.png')} alt="MDP" sx={{ width: 28, height: 28, display: 'block', flexShrink: 0 }} />
            <Typography variant="subtitle2" noWrap>{t('options.brand')}</Typography>
          </Stack>

          <Box sx={{ minHeight: 0, overflow: 'auto', px: 1.25 }}>
            <List dense disablePadding>
              {navItems.map((item) => (
                <ListItem key={item.id} disablePadding sx={{ mb: 0.25 }}>
                  <ListItemButton selected={controller.section === item.id} onClick={() => controller.setSectionAndHash(item.id, { clientDetailOpen: false })} sx={{ minHeight: 40, px: 1 }}>
                    <ListItemIcon sx={{ minWidth: 32, color: controller.section === item.id ? 'primary.main' : 'text.secondary' }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>

          <Stack spacing={1} sx={{ p: 1.25 }}>
            <Autocomplete
              size="small"
              options={['auto', 'zh-CN', 'en']}
              value={preference}
              onChange={(_event, nextValue) => nextValue && void setPreference(nextValue as any)}
              getOptionLabel={(option) => t(`options.locale.${option}`)}
              renderInput={(params) => <TextField {...params} size="small" InputProps={{ ...params.InputProps, startAdornment: <><TranslateOutlined fontSize="small" /><Box sx={{ width: 8, flexShrink: 0 }} />{params.InputProps.startAdornment}</> }} />}
            />
            <ToggleButtonGroup exclusive fullWidth size="small" value={appearancePreference} onChange={(_event, nextValue) => nextValue && void setAppearancePreference(nextValue)}>
              <ToggleButton value="auto" aria-label={t('options.appearance.auto')}><BrightnessAutoOutlined fontSize="small" /></ToggleButton>
              <ToggleButton value="light" aria-label={t('options.appearance.light')}><LightModeOutlined fontSize="small" /></ToggleButton>
              <ToggleButton value="dark" aria-label={t('options.appearance.dark')}><DarkModeOutlined fontSize="small" /></ToggleButton>
            </ToggleButtonGroup>
            <List dense disablePadding>
              <ListItem disablePadding>
                <ListItemButton selected={controller.section === 'settings'} onClick={() => controller.setSectionAndHash('settings', { clientDetailOpen: false })} sx={{ minHeight: 40, px: 1 }}>
                  <ListItemIcon sx={{ minWidth: 32, color: controller.section === 'settings' ? 'primary.main' : 'text.secondary' }}><SettingsOutlined fontSize="small" /></ListItemIcon>
                  <ListItemText primary={t('options.nav.settings')} primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} />
                </ListItemButton>
              </ListItem>
            </List>
          </Stack>
        </Box>
      </Box>

      <Box sx={{ height: '100vh', display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr) auto', minWidth: 0, bgcolor: 'background.default' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, py: 1.5, minHeight: 56, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {controller.section === 'workspace' && t('options.header.workspace')}
            {controller.section === 'settings' && t('options.header.settings')}
            {controller.section === 'clients' && t('options.header.clients')}
            {controller.section === 'market' && t('options.header.market')}
          </Typography>
        </Stack>

        <Stack spacing={1.5} sx={{ p: 1.5, minHeight: 0, overflow: 'auto' }}>
          {controller.section === 'workspace' ? <WorkspaceSection draft={draft} dirty={controller.dirty} runtimeState={controller.runtimeState} /> : null}
          {controller.section === 'settings' ? <GlobalSettingsSection appearancePreference={appearancePreference} draft={draft} importInputRef={controller.importInputRef} localePreference={preference} transferDraft={controller.transferDraft} transferMode={controller.transferMode} transferProvider={controller.transferProvider} transferRef={controller.transferRef} transferRefType={controller.transferRefType} transferRepository={controller.transferRepository} transferSourceMode={controller.transferSourceMode} transferUrl={controller.transferUrl} onChange={controller.setDraft} onMarketAutoCheckChange={(nextValue) => controller.setDraft((current: any) => current ? { ...current, marketAutoCheckUpdates: nextValue } : current)} onAppearancePreferenceChange={setAppearancePreference} onApplyImport={controller.applyImport} onCopy={() => void controller.copyTransferDraft()} onDownload={controller.downloadWorkspace} onExport={() => controller.exportWorkspace()} onFetchImport={(input) => void controller.fetchImportFromSource(input).catch((error: unknown) => controller.notify(formatError(error), 'error'))} onLocalePreferenceChange={setPreference} onReadImportFile={(file) => void controller.readImportFile(file)} onTransferDraftChange={controller.setTransferDraft} onTransferProviderChange={controller.setTransferProvider} onTransferRefChange={controller.setTransferRef} onTransferRefTypeChange={controller.setTransferRefType} onTransferRepositoryChange={controller.setTransferRepository} onTransferSourceModeChange={controller.setTransferSourceMode} onTransferModeChange={controller.setTransferMode} onTransferUrlChange={controller.setTransferUrl} onUpload={() => controller.importInputRef.current?.click()} /> : null}
          {controller.section === 'clients' ? <ClientsSection clientDetailOpen={controller.clientDetailOpen} canCreateFromPage={Boolean(controller.runtimeState?.activeTab?.url)} draft={draft} initialAssetTab={controller.assetTabHint} initialDetailTab={controller.assetTabHint ? 'assets' : undefined} routeSearch={controller.routeSearch} selectedClientId={controller.selectedClientId} runtimeState={controller.runtimeState} onCloseDetail={() => controller.setSectionAndHash('clients', { clientDetailOpen: false })} onOpenDetail={(clientId: any, detailTab?: any) => { controller.setSelectedClientId(clientId); controller.setSectionAndHash('clients', { clientId, clientDetailOpen: true, ...(detailTab === 'assets' ? { assetTab: controller.assetTabHint ?? 'flows' } : {}) }) }} onRouteSearchChange={controller.setRouteSearch} onSelectClient={controller.setSelectedClientId} onChange={controller.setDraft} onCreateClient={(kind: 'background' | 'route') => { if (kind === 'background') { controller.setSelectedClientId('background'); controller.setSectionAndHash('clients', { clientId: 'background', clientDetailOpen: true }); controller.notify(t('options.status.backgroundOpened'), 'info'); return } const nextClient = createClient(draft.routeClients.length + 1, t); controller.setDraft((current: any) => current ? { ...current, routeClients: [...current.routeClients, nextClient] } : current); controller.setSelectedClientId(nextClient.id); controller.setSectionAndHash('clients', { clientId: nextClient.id, clientDetailOpen: true }); controller.notify(t('options.status.clientAdded'), 'success') }} onCreateClientFromPage={() => { const activeUrl = controller.runtimeState?.activeTab?.url; if (!activeUrl) return; const nextClient = createPresetRouteClient(activeUrl); controller.setDraft((current: any) => current ? { ...current, routeClients: [nextClient, ...current.routeClients] } : current); controller.setSelectedClientId(nextClient.id); controller.setSectionAndHash('clients', { clientId: nextClient.id, clientDetailOpen: true }); controller.notify(t('options.status.routePresetCreated'), 'success') }} /> : null}
          {controller.section === 'market' ? <MarketSection marketDetailOpen={controller.marketDetailOpen} marketSources={draft.marketSources} marketUpdates={controller.runtimeState?.marketUpdates} routeClients={draft.routeClients} selectedEntryKey={controller.selectedMarketEntryKey} onAddSource={async (input) => controller.addMarketSource(input)} onInstall={controller.installMarketClient} onCloseDetail={() => controller.setSectionAndHash('market', { marketDetailOpen: false, marketEntryKey: undefined })} onOpenDetail={(entryKey) => controller.setSectionAndHash('market', { marketEntryKey: entryKey, marketDetailOpen: true })} onRemoveSource={controller.removeMarketSource} /> : null}
        </Stack>

        {controller.dirty ? (
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ px: 1.5, py: 0.875, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 600 }}>{t('options.unsavedChanges')}</Typography>
            <Stack direction="row" spacing={1}>
              <Typography component="button" onClick={() => controller.handleDiscardChanges()}>{t('options.discardChanges')}</Typography>
              <Typography component="button" onClick={() => void controller.handleSave()}>{t('options.saveChanges')}</Typography>
            </Stack>
          </Stack>
        ) : <Box />}

        <Snackbar open={controller.statusOpen && Boolean(controller.status)} autoHideDuration={3200} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} onClose={(_event, reason) => { if (reason !== 'clickaway') controller.setStatusOpen(false) }} sx={{ mt: 1, mr: 1 }}>
          <Alert severity={controller.statusTone} variant="filled" onClose={() => controller.setStatusOpen(false)} sx={{ minWidth: 280 }}>{controller.status}</Alert>
        </Snackbar>
      </Box>
    </Box>
  )
}

function createClient(index: number, t: (key: string, values?: Record<string, string | number>) => string) {
  return createRouteClientConfig({
    clientName: t('options.clients.defaultName', { count: index }),
    clientId: `mdp-route-client-${index}`,
    icon: index % 2 === 0 ? 'layers' : 'route'
  })
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
