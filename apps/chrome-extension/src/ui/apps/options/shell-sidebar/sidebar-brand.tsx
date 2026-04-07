import { Box, Collapse, Stack, Tooltip, Typography } from '@mui/material'

import {
  OPTIONS_SHELL_HEADER_HEIGHT,
  OPTIONS_SIDEBAR_COLLAPSED_PADDING_X,
  OPTIONS_SIDEBAR_EXPANDED_PADDING_X
} from '../layout.js'

export function SidebarBrand({
  collapsed,
  title
}: {
  collapsed: boolean
  title: string
}) {
  return (
    <Stack
      direction="row"
      spacing={collapsed ? 0 : 1}
      alignItems="center"
      sx={{
        justifyContent: collapsed ? 'center' : 'flex-start',
        px: collapsed
          ? OPTIONS_SIDEBAR_COLLAPSED_PADDING_X
          : OPTIONS_SIDEBAR_EXPANDED_PADDING_X,
        height: OPTIONS_SHELL_HEADER_HEIGHT,
        boxSizing: 'border-box',
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Tooltip title={collapsed ? title : ''} placement="right">
        <Box
          component="img"
          src={chrome.runtime.getURL('icons/icon.svg')}
          alt="MDP"
          sx={{ width: 28, height: 28, display: 'block', flexShrink: 0 }}
        />
      </Tooltip>
      <Collapse in={!collapsed} orientation="horizontal" collapsedSize={0} timeout={180}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }} noWrap>
          {title}
        </Typography>
      </Collapse>
    </Stack>
  )
}
