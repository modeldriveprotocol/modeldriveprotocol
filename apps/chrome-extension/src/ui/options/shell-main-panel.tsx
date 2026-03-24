import { Alert, Box, Snackbar, Stack, Typography } from '@mui/material'
import { createRouteClientConfig, type ExtensionConfig } from '#~/shared/config.js'
import type { AppearancePreference } from '../appearance.js'
import { createPresetRouteClient } from '../extension-api.js'
import type { LocalePreference } from '../i18n.js'
import { ClientsSection } from './sections/clients-section.js'
import { GlobalSettingsSection } from './sections/global-settings-section.js'
import { MarketSection } from './sections/market-section.js'
import { WorkspaceSection } from './sections/workspace-section.js'
import type { OptionsController } from './use-options-controller.js'
type OptionsMainPanelProps = {
  appearancePreference: AppearancePreference
  controller: OptionsController
  draft: ExtensionConfig
  localePreference: LocalePreference
  setAppearancePreference: (next: AppearancePreference) => Promise<void>
  setLocalePreference: (next: LocalePreference) => Promise<void>
  t: (key: string, values?: Record<string, string | number>) => string
}
export function OptionsMainPanel({
  appearancePreference,
  controller,
  draft,
  localePreference,
  setAppearancePreference,
  setLocalePreference,
  t
}: OptionsMainPanelProps) {
  return (
    <Box
      sx={{
        height: '100vh',
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr) auto',
        minWidth: 0,
        bgcolor: 'background.default'
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          px: 1.5,
          py: 1.5,
          minHeight: 56,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.default'
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {controller.section === 'workspace' && t('options.header.workspace')}
          {controller.section === 'settings' && t('options.header.settings')}
          {controller.section === 'clients' && t('options.header.clients')}
          {controller.section === 'market' && t('options.header.market')}
        </Typography>
      </Stack>

      <Stack spacing={1.5} sx={{ p: 1.5, minHeight: 0, overflow: 'auto' }}>
        {controller.section === 'workspace' ? (
          <WorkspaceSection
            draft={draft}
            dirty={controller.dirty}
            runtimeState={controller.runtimeState}
          />
        ) : null}
        {controller.section === 'settings' ? (
          <GlobalSettingsSection
            appearancePreference={appearancePreference}
            draft={draft}
            importInputRef={controller.importInputRef}
            localePreference={localePreference}
            transferDraft={controller.transferDraft}
            transferMode={controller.transferMode}
            transferProvider={controller.transferProvider}
            transferRef={controller.transferRef}
            transferRefType={controller.transferRefType}
            transferRepository={controller.transferRepository}
            transferSourceMode={controller.transferSourceMode}
            transferUrl={controller.transferUrl}
            onChange={controller.setDraft}
            onMarketAutoCheckChange={(nextValue) =>
              controller.setDraft((current: any) =>
                current ? { ...current, marketAutoCheckUpdates: nextValue } : current
              )
            }
            onAppearancePreferenceChange={setAppearancePreference}
            onApplyImport={controller.applyImport}
            onCopy={() => void controller.copyTransferDraft()}
            onDownload={controller.downloadWorkspace}
            onExport={() => controller.exportWorkspace()}
            onFetchImport={(input) =>
              void controller
                .fetchImportFromSource(input)
                .catch((error: unknown) =>
                  controller.notify(formatError(error), 'error')
                )
            }
            onLocalePreferenceChange={setLocalePreference}
            onReadImportFile={(file) => void controller.readImportFile(file)}
            onTransferDraftChange={controller.setTransferDraft}
            onTransferProviderChange={controller.setTransferProvider}
            onTransferRefChange={controller.setTransferRef}
            onTransferRefTypeChange={controller.setTransferRefType}
            onTransferRepositoryChange={controller.setTransferRepository}
            onTransferSourceModeChange={controller.setTransferSourceMode}
            onTransferModeChange={controller.setTransferMode}
            onTransferUrlChange={controller.setTransferUrl}
            onUpload={() => controller.importInputRef.current?.click()}
          />
        ) : null}
        {controller.section === 'clients' ? (
          <ClientsSection
            clientDetailOpen={controller.clientDetailOpen}
            canCreateFromPage={Boolean(controller.runtimeState?.activeTab?.url)}
            draft={draft}
            initialAssetTab={controller.assetTabHint}
            initialDetailTab={controller.assetTabHint ? 'assets' : undefined}
            routeSearch={controller.routeSearch}
            selectedClientId={controller.selectedClientId}
            runtimeState={controller.runtimeState}
            onCloseDetail={() =>
              controller.setSectionAndHash('clients', {
                clientDetailOpen: false
              })
            }
            onOpenDetail={(clientId: any, detailTab?: any) => {
              controller.setSelectedClientId(clientId)
              controller.setSectionAndHash('clients', {
                clientId,
                clientDetailOpen: true,
                ...(detailTab === 'assets'
                  ? { assetTab: controller.assetTabHint ?? 'flows' }
                  : {})
              })
            }}
            onRouteSearchChange={controller.setRouteSearch}
            onSelectClient={controller.setSelectedClientId}
            onChange={controller.setDraft}
            onCreateClient={(kind: 'background' | 'route') => {
              if (kind === 'background') {
                controller.setSelectedClientId('background')
                controller.setSectionAndHash('clients', {
                  clientId: 'background',
                  clientDetailOpen: true
                })
                controller.notify(t('options.status.backgroundOpened'), 'info')
                return
              }

              const nextClient = createClient(draft.routeClients.length + 1, t)
              controller.setDraft((current: any) =>
                current
                  ? {
                      ...current,
                      routeClients: [...current.routeClients, nextClient]
                    }
                  : current
              )
              controller.setSelectedClientId(nextClient.id)
              controller.setSectionAndHash('clients', {
                clientId: nextClient.id,
                clientDetailOpen: true
              })
              controller.notify(t('options.status.clientAdded'), 'success')
            }}
            onCreateClientFromPage={() => {
              const activeUrl = controller.runtimeState?.activeTab?.url
              if (!activeUrl) {
                return
              }
              const nextClient = createPresetRouteClient(activeUrl)
              controller.setDraft((current: any) =>
                current
                  ? {
                      ...current,
                      routeClients: [nextClient, ...current.routeClients]
                    }
                  : current
              )
              controller.setSelectedClientId(nextClient.id)
              controller.setSectionAndHash('clients', {
                clientId: nextClient.id,
                clientDetailOpen: true
              })
              controller.notify(
                t('options.status.routePresetCreated'),
                'success'
              )
            }}
          />
        ) : null}
        {controller.section === 'market' ? (
          <MarketSection
            marketDetailOpen={controller.marketDetailOpen}
            marketSources={draft.marketSources}
            marketUpdates={controller.runtimeState?.marketUpdates}
            routeClients={draft.routeClients}
            selectedEntryKey={controller.selectedMarketEntryKey}
            onAddSource={async (input) => controller.addMarketSource(input)}
            onInstall={controller.installMarketClient}
            onCloseDetail={() =>
              controller.setSectionAndHash('market', {
                marketDetailOpen: false,
                marketEntryKey: undefined
              })
            }
            onOpenDetail={(entryKey) =>
              controller.setSectionAndHash('market', {
                marketEntryKey: entryKey,
                marketDetailOpen: true
              })
            }
            onRemoveSource={controller.removeMarketSource}
          />
        ) : null}
      </Stack>

      {controller.dirty ? (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{
            px: 1.5,
            py: 0.875,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: 'warning.main', fontWeight: 600 }}
          >
            {t('options.unsavedChanges')}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Typography
              component="button"
              onClick={() => controller.handleDiscardChanges()}
            >
              {t('options.discardChanges')}
            </Typography>
            <Typography
              component="button"
              onClick={() => void controller.handleSave()}
            >
              {t('options.saveChanges')}
            </Typography>
          </Stack>
        </Stack>
      ) : (
        <Box />
      )}

      <Snackbar
        open={controller.statusOpen && Boolean(controller.status)}
        autoHideDuration={3200}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        onClose={(_event, reason) => {
          if (reason !== 'clickaway') {
            controller.setStatusOpen(false)
          }
        }}
        sx={{ mt: 1, mr: 1 }}
      >
        <Alert
          severity={controller.statusTone}
          variant="filled"
          onClose={() => controller.setStatusOpen(false)}
          sx={{ minWidth: 280 }}
        >
          {controller.status}
        </Alert>
      </Snackbar>
    </Box>
  )
}

function createClient(
  index: number,
  t: (key: string, values?: Record<string, string | number>) => string
) {
  return createRouteClientConfig({
    clientName: t('options.clients.defaultName', { count: index }),
    clientId: `mdp-route-client-${index}`,
    icon: index % 2 === 0 ? 'layers' : 'route'
  })
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
