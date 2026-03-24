import InsightsOutlined from '@mui/icons-material/InsightsOutlined'
import HubOutlined from '@mui/icons-material/HubOutlined'
import RouteOutlined from '@mui/icons-material/RouteOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import StorageOutlined from '@mui/icons-material/StorageOutlined'
import WindowOutlined from '@mui/icons-material/WindowOutlined'
import { Box, Stack } from '@mui/material'

import type { ExtensionConfig } from '#~/shared/config.js'
import type { PopupState } from '#~/background/shared.js'
import { useI18n } from '../../../i18n/provider.js'
import { OverviewStat, SectionPanel } from '../shared.js'
import { WorkspaceInvocationOverview } from './invocation-insights.js'

export function WorkspaceSection({
  dirty,
  draft,
  onClearInvocationHistory,
  onOpenClientActivity,
  runtimeState
}: {
  dirty: boolean
  draft: ExtensionConfig
  onClearInvocationHistory: () => void
  onOpenClientActivity: (clientKey: string) => void
  runtimeState: PopupState | undefined
}) {
  const { t } = useI18n()
  const enabledRouteCount = draft.routeClients.filter((client) => client.enabled).length
  const activeRouteCount =
    runtimeState?.clients.filter(
      (client) => client.kind === 'route' && client.matchingTabCount > 0
    ).length ?? 0

  return (
    <Stack spacing={1.5}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' }, gap: 1 }}>
        <OverviewStat label={t('options.workspace.overview.routes', { count: draft.routeClients.length })} icon={<RouteOutlined fontSize="small" />} />
        <OverviewStat label={t('options.workspace.overview.enabledRoutes', { count: enabledRouteCount })} icon={<SettingsOutlined fontSize="small" />} />
        <OverviewStat label={t('options.workspace.overview.activeRoutes', { count: activeRouteCount })} icon={<WindowOutlined fontSize="small" />} tone={activeRouteCount > 0 ? 'success.main' : 'text.secondary'} />
        <OverviewStat label={t('options.workspace.overview.onlineClients', { count: runtimeState?.onlineClientCount ?? 0 })} icon={<HubOutlined fontSize="small" />} />
        <OverviewStat label={dirty ? t('options.workspace.overview.draft') : t('options.workspace.overview.saved')} icon={<StorageOutlined fontSize="small" />} tone={dirty ? 'warning.main' : 'success.main'} />
      </Box>

      <SectionPanel
        title={t('options.workspace.invocations.title')}
        description={t('options.workspace.invocations.description')}
        icon={<InsightsOutlined fontSize="small" />}
      >
        <WorkspaceInvocationOverview
          onClearHistory={onClearInvocationHistory}
          overview={runtimeState?.invocationOverview}
          onOpenClientActivity={onOpenClientActivity}
        />
      </SectionPanel>
    </Stack>
  )
}
