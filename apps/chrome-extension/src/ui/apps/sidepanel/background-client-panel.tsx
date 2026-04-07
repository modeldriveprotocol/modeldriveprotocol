import DnsOutlined from '@mui/icons-material/DnsOutlined'
import { Tooltip } from '@mui/material'
import { useMemo } from 'react'

import { openOptionsSection } from '../../platform/extension-api.js'
import { SidepanelAssetPreview } from './client-asset-preview.js'
import {
  BACKGROUND_ROOT_SKILL_PATH,
  createBackgroundAssetPreviewEntries,
  getPreferredPreviewPath
} from './client-asset-preview-model.js'
import { ClientPanelShell } from './client-panel-shell.js'
import { ConnectionStateIndicator } from './connection-state-indicator.js'
import type { SidepanelController, SidepanelClientEntry } from './types.js'

export function BackgroundClientPanel({
  controller,
  expanded,
  item,
  onExpandedChange
}: {
  controller: SidepanelController
  expanded: boolean
  item: SidepanelClientEntry
  onExpandedChange: (expanded: boolean) => void
}) {
  const clientConfig = controller.state?.config.backgroundClients.find(
    (entry) => entry.id === item.client.id
  )
  const assetEntries = useMemo(
    () =>
      clientConfig ? createBackgroundAssetPreviewEntries(clientConfig) : [],
    [clientConfig]
  )

  return (
    <ClientPanelShell
      collapseLabel={controller.t('common.collapse')}
      expandLabel={controller.t('common.expand')}
      expanded={expanded}
      onChange={onExpandedChange}
      icon={item.client.icon}
      iconBadge={(
        <ConnectionStateIndicator state={item.client.connectionState} t={controller.t} />
      )}
      titlePrefix={(
        <Tooltip title={controller.t('popup.section.background')}>
          <DnsOutlined fontSize="inherit" />
        </Tooltip>
      )}
      title={item.client.clientName}
      onTitleClick={() => void openOptionsSection('clients', { clientId: item.client.id })}
    >
      <SidepanelAssetPreview
        entries={assetEntries}
        preferredPath={getPreferredPreviewPath(assetEntries, BACKGROUND_ROOT_SKILL_PATH)}
        emptyLabel={controller.t('popup.noExposedAssets')}
        pathLabel={controller.t('common.path')}
      />
    </ClientPanelShell>
  )
}
