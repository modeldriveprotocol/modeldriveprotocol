import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined'
import RefreshOutlined from '@mui/icons-material/RefreshOutlined'
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Snackbar,
  Stack,
  Tooltip,
  Typography
} from '@mui/material'
import { createClientKey } from '#~/background/shared.js'
import {
  createBackgroundClientConfig,
  createRouteClientConfig,
  type BackgroundClientConfig,
  type ExtensionConfig,
  type RouteClientConfig
} from '#~/shared/config.js'
import type { AppearancePreference } from '../../foundation/appearance.js'
import { createPresetRouteClient } from '../../platform/extension-api.js'
import type { LocalePreference } from '../../i18n/provider.js'
import { OPTIONS_SHELL_HEADER_HEIGHT } from './layout.js'
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
  const clientItems = [
    ...draft.backgroundClients.map((client) => ({
      kind: 'background' as const,
      id: client.id,
      client
    })),
    ...draft.routeClients.map((client) => ({
      kind: 'route' as const,
      id: client.id,
      client
    }))
  ]
  const selectedClientItem =
    clientItems.find((item) => item.id === controller.selectedClientId) ??
    clientItems.find((item) => item.kind === 'route') ??
    clientItems[0]
  const clientDetailTitle =
    controller.section === 'clients' && controller.clientDetailOpen
      ? selectedClientItem?.client.clientName
      : undefined
  const headerTitle =
    clientDetailTitle ??
    (controller.section === 'workspace'
      ? t('options.header.workspace')
      : controller.section === 'settings'
      ? t('options.header.settings')
      : controller.section === 'clients'
      ? t('options.header.clients')
      : t('options.header.market'))

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
          height: OPTIONS_SHELL_HEADER_HEIGHT,
          boxSizing: 'border-box',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.default'
        }}
      >
        {controller.section === 'clients' && controller.clientDetailOpen ? (
          <Tooltip title={t('options.clients.backToList')}>
            <IconButton
              size="small"
              aria-label={t('options.clients.backToList')}
              onClick={() =>
                controller.setSectionAndHash('clients', {
                  clientDetailOpen: false
                })
              }
              sx={{ ml: -0.5 }}
            >
              <ArrowBackOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            flexGrow: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {headerTitle}
        </Typography>
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          sx={{ flexShrink: 0 }}
        >
          {controller.section === 'clients' &&
          controller.clientDetailOpen &&
          selectedClientItem ? (
            <Tooltip title={t('options.clients.duplicate')}>
              <IconButton
                size="small"
                aria-label={t('options.clients.duplicate')}
                onClick={() => {
                  const nextClient = forkEditableClient(selectedClientItem, t)

                  controller.setDraft((current: any) =>
                    current
                      ? selectedClientItem.kind === 'background'
                        ? {
                            ...current,
                            backgroundClients: [
                              ...current.backgroundClients,
                              nextClient
                            ]
                          }
                        : {
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
                  controller.notify(
                    t('options.status.clientForked', {
                      name: nextClient.clientName
                    }),
                    'success'
                  )
                }}
              >
                <ContentCopyOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
          {controller.runtimeStateUpdatedAt ? (
            <Typography variant="caption" color="text.secondary" noWrap>
              {formatRuntimeTimestamp(controller.runtimeStateUpdatedAt)}
            </Typography>
          ) : null}
          <Tooltip title={t('options.toolbar.refresh')}>
            <span>
              <IconButton
                size="small"
                aria-label={t('options.toolbar.refresh')}
                disabled={controller.runtimeRefreshing}
                onClick={() =>
                  void controller.refreshRuntimeState({
                    notify: true,
                    suppressError: true
                  })
                }
              >
                {controller.runtimeRefreshing ? (
                  <CircularProgress size={16} />
                ) : (
                  <RefreshOutlined fontSize="small" />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      <Stack
        spacing={1.5}
        sx={{
          px: 1.5,
          pb: 1.5,
          pt:
            controller.section === 'clients' && controller.clientDetailOpen
              ? 0
              : 1.5,
          minHeight: 0,
          overflow: 'auto'
        }}
      >
        {controller.section === 'workspace' ? (
          <WorkspaceSection
            draft={draft}
            dirty={controller.dirty}
            onClearInvocationHistory={() => {
              void controller.clearInvocationHistory()
            }}
            onOpenClientActivity={(clientKey) => {
              const selectedId = resolveEditableClientId(clientKey)
              controller.setSelectedClientId(selectedId)
              controller.setSectionAndHash('clients', {
                clientId: selectedId,
                clientDetailOpen: true,
                detailTab: 'activity'
              })
            }}
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
                current
                  ? { ...current, marketAutoCheckUpdates: nextValue }
                  : current
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
            initialDetailTab={
              controller.detailTabHint ??
              (controller.assetTabHint ? 'assets' : undefined)
            }
            routeSearch={controller.routeSearch}
            selectedClientId={controller.selectedClientId}
            runtimeState={controller.runtimeState}
            onClearInvocationHistory={() => {
              if (!selectedClientItem) {
                return
              }

              void controller.clearInvocationHistory(
                selectedClientItem.kind === 'background'
                  ? createClientKey('background', selectedClientItem.id)
                  : createClientKey('route', selectedClientItem.id)
              )
            }}
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
                  ? {
                      assetTab: controller.assetTabHint ?? 'flows',
                      detailTab: 'assets'
                    }
                  : detailTab
                  ? { detailTab }
                  : {})
              })
            }}
            onRouteSearchChange={controller.setRouteSearch}
            onSelectClient={controller.setSelectedClientId}
            onChange={controller.setDraft}
            onCreateClient={(kind: 'background' | 'route') => {
              const nextClient =
                kind === 'background'
                  ? createBackgroundClient(
                      draft.backgroundClients.length + 1,
                      t
                    )
                  : createRouteClient(draft.routeClients.length + 1, t)
              controller.setDraft((current: any) =>
                current
                  ? {
                      ...current,
                      ...(kind === 'background'
                        ? {
                            backgroundClients: [
                              ...current.backgroundClients,
                              nextClient
                            ]
                          }
                        : {
                            routeClients: [...current.routeClients, nextClient]
                          })
                    }
                  : current
              )
              controller.setSelectedClientId(nextClient.id)
              controller.setSectionAndHash('clients', {
                clientId: nextClient.id,
                clientDetailOpen: true
              })
              controller.notify(
                t(
                  kind === 'background'
                    ? 'options.status.backgroundClientAdded'
                    : 'options.status.clientAdded'
                ),
                'success'
              )
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

function createRouteClient(
  index: number,
  t: (key: string, values?: Record<string, string | number>) => string
) {
  return createRouteClientConfig({
    clientName: t('options.clients.defaultName', { count: index }),
    clientId: `mdp-route-client-${index}`,
    icon: index % 2 === 0 ? 'layers' : 'route'
  })
}

function createBackgroundClient(
  index: number,
  t: (key: string, values?: Record<string, string | number>) => string
) {
  return createBackgroundClientConfig({
    clientName: t('options.clients.backgroundDefaultName', { count: index }),
    clientId: `mdp-background-client-${index}`,
    icon: 'chrome'
  })
}

function forkEditableClient(
  item:
    | {
        kind: 'background'
        id: string
        client: BackgroundClientConfig
      }
    | {
        kind: 'route'
        id: string
        client: RouteClientConfig
      },
  t: (key: string, values?: Record<string, string | number>) => string
) {
  const nextName = `${item.client.clientName} ${t(
    'options.clients.copySuffix'
  )}`

  if (item.kind === 'background') {
    const { id: _id, clientId: _clientId, ...backgroundRest } = item.client

    return createBackgroundClientConfig({
      ...backgroundRest,
      clientName: nextName,
      favorite: false,
      disabledExposePaths: [...item.client.disabledExposePaths]
    })
  }

  const {
    id: _id,
    clientId: _clientId,
    installSource: _installSource,
    ...routeRest
  } = item.client

  return createRouteClientConfig({
    ...routeRest,
    clientName: nextName,
    favorite: false,
    routeRules: item.client.routeRules.map((rule) => ({ ...rule })),
    recordings: item.client.recordings.map((recording) => ({
      ...recording,
      capturedFeatures: [...recording.capturedFeatures],
      steps: recording.steps.map((step) => ({
        ...step,
        alternativeSelectors: [...step.alternativeSelectors],
        classes: [...step.classes]
      }))
    })),
    selectorResources: item.client.selectorResources.map((resource) => ({
      ...resource,
      alternativeSelectors: [...resource.alternativeSelectors],
      classes: [...resource.classes],
      attributes: { ...resource.attributes }
    })),
    skillFolders: item.client.skillFolders.map((folder) => ({ ...folder })),
    skillEntries: item.client.skillEntries.map((skill) => ({
      ...skill,
      metadata: {
        ...skill.metadata,
        queryParameters: skill.metadata.queryParameters.map((parameter) => ({
          ...parameter
        })),
        headerParameters: skill.metadata.headerParameters.map((parameter) => ({
          ...parameter
        }))
      }
    }))
  })
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function formatRuntimeTimestamp(value: string): string {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function resolveEditableClientId(clientKey: string): string {
  if (clientKey.startsWith('route:')) {
    return clientKey.slice('route:'.length)
  }

  if (clientKey.startsWith('background:')) {
    return clientKey.slice('background:'.length)
  }

  return clientKey
}
