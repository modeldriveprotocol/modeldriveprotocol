import DownloadOutlined from '@mui/icons-material/DownloadOutlined'
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'
import {
  Box,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip
} from '@mui/material'

import { renderClientIcon } from '../../../../foundation/client-icons.js'
import { ToolbarIcon } from '../../shared.js'
import { useDelayedHoverActions } from '../use-delayed-hover-actions.js'
import type { MarketEntryItem } from './types.js'

export function MarketEntryRow({
  active,
  item,
  onActivate,
  onInstall,
  onOpenDetail,
  t
}: {
  active: boolean
  item: MarketEntryItem
  onActivate: () => void
  onInstall: () => void
  onOpenDetail: () => void
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  const { actionControlsVisible, bind } = useDelayedHoverActions()
  const metaLabel = [item.catalog.title, t('options.market.localClients', { count: item.localCount })].join(' · ')

  return (
    <ListItem disablePadding>
      <ListItemButton
        className="market-entry-row-button"
        selected={active}
        onClick={onOpenDetail}
        onFocus={(event) => {
          bind.onFocus()
          onActivate()
        }}
        onBlur={bind.onBlur}
        onMouseEnter={() => {
          bind.onMouseEnter()
          onActivate()
        }}
        onMouseLeave={bind.onMouseLeave}
        sx={{
          minHeight: 60,
          px: 1.25,
          py: 0.75,
          alignItems: 'center'
        }}
      >
        <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}>
          {renderClientIcon(item.entry.icon)}
        </ListItemIcon>
        <ListItemText
          primary={item.entry.title}
          secondary={item.entry.summary || t('options.market.noSummary')}
          primaryTypographyProps={{
            variant: 'body2',
            fontWeight: 600,
            noWrap: true
          }}
          secondaryTypographyProps={{
            variant: 'caption',
            noWrap: true
          }}
        />
        <Box
          sx={{
            pl: 1,
            width: 168,
            flexShrink: 0,
            height: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end'
          }}
        >
          {actionControlsVisible ? (
            <Stack
              direction="row"
              spacing={0.25}
              onClick={(event) => event.stopPropagation()}
            >
              <ToolbarIcon
                label={t('options.market.openPreview')}
                onClick={(event) => {
                  event.stopPropagation()
                  onOpenDetail()
                }}
              >
                <VisibilityOutlined fontSize="small" />
              </ToolbarIcon>
              <ToolbarIcon
                label={
                  item.localCount > 0
                    ? t('options.market.installAgain')
                    : t('options.market.install')
                }
                tone={item.localCount > 0 ? 'warning' : 'primary'}
                onClick={(event) => {
                  event.stopPropagation()
                  onInstall()
                }}
              >
                <DownloadOutlined fontSize="small" />
              </ToolbarIcon>
            </Stack>
          ) : (
            <Tooltip title={metaLabel}>
              <Box
                component="span"
                sx={{
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textAlign: 'right',
                  fontSize: 12,
                  color: 'text.secondary'
                }}
              >
                {metaLabel}
              </Box>
            </Tooltip>
          )}
        </Box>
      </ListItemButton>
    </ListItem>
  )
}
