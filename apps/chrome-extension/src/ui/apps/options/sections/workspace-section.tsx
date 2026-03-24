import HubOutlined from '@mui/icons-material/HubOutlined'
import RouteOutlined from '@mui/icons-material/RouteOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import StorageOutlined from '@mui/icons-material/StorageOutlined'
import { Box } from '@mui/material'

import type { ExtensionConfig } from '#~/shared/config.js'
import type { PopupState } from '#~/background/shared.js'
import { useI18n } from '../../../i18n/provider.js'
import { OverviewStat } from '../shared.js'

export function WorkspaceSection({
  dirty,
  draft,
  runtimeState
}: {
  dirty: boolean
  draft: ExtensionConfig
  runtimeState: PopupState | undefined
}) {
  const { t } = useI18n()
  const enabledRouteCount = draft.routeClients.filter((client) => client.enabled).length

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1 }}>
      <OverviewStat label={t('options.workspace.overview.routes', { count: draft.routeClients.length })} icon={<RouteOutlined fontSize="small" />} />
      <OverviewStat label={t('options.workspace.overview.enabledRoutes', { count: enabledRouteCount })} icon={<SettingsOutlined fontSize="small" />} />
      <OverviewStat label={t('options.workspace.overview.onlineClients', { count: runtimeState?.onlineClientCount ?? 0 })} icon={<HubOutlined fontSize="small" />} />
      <OverviewStat label={dirty ? t('options.workspace.overview.draft') : t('options.workspace.overview.saved')} icon={<StorageOutlined fontSize="small" />} tone={dirty ? 'warning.main' : 'success.main'} />
    </Box>
  )
}
