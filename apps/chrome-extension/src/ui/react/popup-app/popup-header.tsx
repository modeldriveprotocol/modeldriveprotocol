import DownloadOutlined from '@mui/icons-material/DownloadOutlined'
import GridViewOutlined from '@mui/icons-material/GridViewOutlined'
import HubOutlined from '@mui/icons-material/HubOutlined'
import RefreshOutlined from '@mui/icons-material/RefreshOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined'
import StorageOutlined from '@mui/icons-material/StorageOutlined'
import ViewSidebarOutlined from '@mui/icons-material/ViewSidebarOutlined'
import { Box, Chip, Paper, Stack, Typography } from '@mui/material'

import { openOptionsSection, openSidePanel, refreshRuntime } from '../extension-api.js'
import { ActionIcon } from './action-icon.js'
import type { PopupController } from './types.js'

export function PopupHeader({ controller }: { controller: PopupController }) {
  const title = controller.state?.activeTab?.title ?? controller.t('popup.currentPageTitle')
  const subtitle = controller.state?.activeTab?.url ?? controller.t('popup.currentPageSubtitle')

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', px: 1.5, py: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
            <Box sx={iconBoxSx}><ViewSidebarOutlined fontSize="small" /></Box>
            <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800 }}>{controller.t('popup.pageControl')}</Typography>
          </Stack>
          <Typography variant="h5" sx={{ lineHeight: 1.05 }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>{subtitle}</Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          <ActionIcon label={controller.t('popup.refresh')} onClick={() => void controller.runAction(controller.t('popup.runtimeRefreshed'), refreshRuntime)}><RefreshOutlined fontSize="small" /></ActionIcon>
          <ActionIcon label={controller.t('popup.openImports')} onClick={() => void openOptionsSection('settings')}><DownloadOutlined fontSize="small" /></ActionIcon>
          <ActionIcon label={controller.t('popup.openMarket')} onClick={() => void openOptionsSection('market')}><StorefrontOutlined fontSize="small" /></ActionIcon>
          <ActionIcon label={controller.t('popup.openSidePanel')} onClick={() => void controller.runAction(controller.t('popup.openSidePanel'), openSidePanel)}><GridViewOutlined fontSize="small" /></ActionIcon>
          <ActionIcon label={controller.t('popup.openOptions')} onClick={() => void openOptionsSection('clients', { clientId: controller.selectedClient?.id })}><SettingsOutlined fontSize="small" /></ActionIcon>
        </Stack>
      </Stack>
      <Stack direction="row" spacing={0.75} sx={{ mt: 1.25, flexWrap: 'wrap' }}>
        <Chip size="small" icon={<GridViewOutlined />} label={controller.t('popup.pageClientsBadge', { count: controller.pageRouteClients.length })} color={controller.pageRouteClients.length > 0 ? 'success' : 'default'} />
        <Chip size="small" icon={<StorageOutlined />} label={controller.t('popup.onlineClientsBadge', { count: controller.state?.onlineClientCount ?? 0 })} />
        <Chip size="small" icon={<HubOutlined />} label={controller.state?.bridgeState ? controller.t('popup.bridgeToolsBadge', { count: controller.state.bridgeState.tools.length }) : controller.t('popup.bridgeNotReady')} color={controller.state?.bridgeState ? 'success' : 'warning'} />
      </Stack>
    </Paper>
  )
}

const iconBoxSx = {
  width: 30,
  height: 30,
  borderRadius: '10px',
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  color: 'text.primary',
  display: 'grid',
  placeItems: 'center'
}
