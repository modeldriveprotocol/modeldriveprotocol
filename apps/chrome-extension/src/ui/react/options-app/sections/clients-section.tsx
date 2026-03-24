import { Button, Stack, Typography } from '@mui/material'

import type { ExtensionConfig } from '#~/shared/config.js'
import type { PopupState } from '#~/background/shared.js'
import { useI18n } from '../../i18n.js'
import { BackgroundClientEditor } from './background-client-editor.js'
import { ClientEditor } from './client-editor.js'
import { ClientsListPanel } from './clients-list-panel.js'

export function ClientsSection(props: {
  clientDetailOpen: boolean
  canCreateFromPage: boolean
  draft: ExtensionConfig
  initialAssetTab: any
  initialDetailTab: any
  routeSearch: string
  selectedClientId: any
  runtimeState: PopupState | undefined
  onCloseDetail: () => void
  onOpenDetail: (clientId: any, detailTab?: any) => void
  onRouteSearchChange: (value: string) => void
  onSelectClient: (clientId: any) => void
  onChange: (config: ExtensionConfig) => void
  onCreateClient: (kind: 'background' | 'route') => void
  onCreateClientFromPage: () => void
}) {
  const { t } = useI18n()
  const { clientDetailOpen, canCreateFromPage, draft, initialAssetTab, initialDetailTab, routeSearch, selectedClientId, runtimeState, onCloseDetail, onOpenDetail, onRouteSearchChange, onSelectClient, onChange, onCreateClient, onCreateClientFromPage } = props
  const backgroundRuntimeState = runtimeState?.clients.find((client) => client.kind === 'background')
  const currentPageUrl = runtimeState?.activeTab?.url
  const clientItems = [
    { kind: 'background' as const, id: 'background' as const, client: draft.backgroundClient },
    ...draft.routeClients.map((client) => ({ kind: 'route' as const, id: client.id, client }))
  ]
  const selectedClientItem =
    clientItems.find((item) => item.id === selectedClientId) ??
    clientItems.find((item) => item.kind === 'route') ??
    clientItems[0]

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
    <Stack spacing={1.25}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 0.25, py: 0.25 }}>
        <Button size="small" variant="text" onClick={onCloseDetail} sx={{ px: 0 }}>
          {t('options.clients.backToList')}
        </Button>
        {selectedClientItem ? <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>{selectedClientItem.client.clientName}</Typography> : null}
      </Stack>
      {selectedClientItem ? (
        selectedClientItem.kind === 'background' ? (
          <BackgroundClientEditor client={selectedClientItem.client} draft={draft} runtimeState={backgroundRuntimeState?.connectionState} onChange={onChange} />
        ) : (
          <ClientEditor client={selectedClientItem.client} draft={draft} currentPageUrl={currentPageUrl} initialAssetTab={initialAssetTab} initialTab={initialDetailTab} onChange={onChange} />
        )
      ) : (
        <Typography variant="body2" color="text.secondary">{t('options.clients.empty')}</Typography>
      )}
    </Stack>
  )
}
