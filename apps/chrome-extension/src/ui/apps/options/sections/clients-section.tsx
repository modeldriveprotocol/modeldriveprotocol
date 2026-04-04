import { Typography } from '@mui/material'

import type { ExtensionConfig } from '#~/shared/config.js'
import type { PopupState } from '#~/background/shared.js'
import { useI18n } from '../../../i18n/provider.js'
import { BackgroundClientEditor } from './background-client-editor.js'
import { ClientEditor } from './client-editor.js'
import { ClientsListPanel } from './clients-list-panel.js'

export function ClientsSection(props: {
  clientDetailOpen: boolean
  canCreateFromPage: boolean
  draft: ExtensionConfig
  initialAssetPath: string | undefined
  initialAssetTab: any
  initialDetailTab: any
  routeSearch: string
  selectedClientId: any
  runtimeState: PopupState | undefined
  onAssetPathChange: (path: string | undefined, tab: any) => void
  onClearInvocationHistory: () => void
  onCloseDetail: () => void
  onDetailTabChange: (tab: any) => void
  onOpenDetail: (clientId: any, detailTab?: any) => void
  onRouteSearchChange: (value: string) => void
  onSelectClient: (clientId: any) => void
  onChange: (config: ExtensionConfig) => void
  onCreateClient: (kind: 'background' | 'route') => void
  onCreateClientFromPage: () => void
}) {
  const { t } = useI18n()
  const {
    clientDetailOpen,
    canCreateFromPage,
    draft,
    initialAssetPath,
    initialAssetTab,
    initialDetailTab,
    routeSearch,
    selectedClientId,
    runtimeState,
    onAssetPathChange,
    onClearInvocationHistory,
    onCloseDetail,
    onDetailTabChange,
    onOpenDetail,
    onRouteSearchChange,
    onSelectClient,
    onChange,
    onCreateClient,
    onCreateClientFromPage
  } = props
  const currentPageUrl = runtimeState?.activeTab?.url
  const clientItems = [
    ...draft.backgroundClients.map((client) => ({
      kind: 'background' as const,
      id: client.id,
      client
    })),
    ...draft.routeClients.map((client) => ({ kind: 'route' as const, id: client.id, client }))
  ]
  const selectedClientItem =
    clientItems.find((item) => item.id === selectedClientId) ??
    clientItems.find((item) => item.kind === 'route') ??
    clientItems[0]
  const backgroundRuntimeState =
    selectedClientItem?.kind === 'background'
      ? runtimeState?.clients.find(
          (client) => client.kind === 'background' && client.id === selectedClientItem.id
        )
      : undefined
  const routeRuntimeState =
    selectedClientItem?.kind === 'route'
      ? runtimeState?.clients.find(
          (client) => client.kind === 'route' && client.id === selectedClientItem.id
        )
      : undefined

  if (!clientDetailOpen) {
    return (
      <ClientsListPanel
        canCreateFromPage={canCreateFromPage}
        currentPageUrl={currentPageUrl}
        draft={draft}
        routeSearch={routeSearch}
        runtimeState={runtimeState}
        selectedClientId={selectedClientId}
        onChange={onChange}
        onCreateClient={onCreateClient}
        onCreateClientFromPage={onCreateClientFromPage}
        onOpenDetail={onOpenDetail}
        onRouteSearchChange={onRouteSearchChange}
        onSelectClient={onSelectClient}
      />
    )
  }

  return (
    selectedClientItem ? (
      selectedClientItem.kind === 'background' ? (
        <BackgroundClientEditor
          client={selectedClientItem.client}
          draft={draft}
          initialAssetPath={initialAssetPath}
          initialTab={initialDetailTab}
          invocationStats={backgroundRuntimeState?.invocationStats}
          runtimeState={backgroundRuntimeState?.connectionState}
          onAssetPathChange={onAssetPathChange}
          onClearHistory={onClearInvocationHistory}
          onTabChange={onDetailTabChange}
          onChange={onChange}
        />
      ) : (
        <ClientEditor
          client={selectedClientItem.client}
          currentPageUrl={currentPageUrl}
          draft={draft}
          initialAssetPath={initialAssetPath}
          initialAssetTab={initialAssetTab}
          initialTab={initialDetailTab}
          invocationStats={routeRuntimeState?.invocationStats}
          matchingTabCount={routeRuntimeState?.matchingTabCount}
          onAssetPathChange={onAssetPathChange}
          onClearHistory={onClearInvocationHistory}
          onTabChange={onDetailTabChange}
          onChange={onChange}
        />
      )
    ) : (
      <Typography variant="body2" color="text.secondary">{t('options.clients.empty')}</Typography>
    )
  )
}
