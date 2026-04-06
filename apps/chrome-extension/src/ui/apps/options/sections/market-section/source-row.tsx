import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import {
  Box,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Tooltip
} from '@mui/material'

import { ToolbarIcon } from '../../shared.js'
import { useDelayedHoverActions } from '../use-delayed-hover-actions.js'
import type { MarketSourceSummary } from './types.js'

export function MarketSourceRow({
  summary,
  onEdit,
  onRemove,
  t
}: {
  summary: MarketSourceSummary
  onEdit: () => void
  onRemove: () => void
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  const { actionControlsVisible, bind } = useDelayedHoverActions()
  const primaryText =
    summary.source.kind === 'repository' &&
    summary.source.repository &&
    summary.source.ref
      ? `${summary.title} · ${summary.source.repository}@${summary.source.ref}`
      : summary.title
  const secondaryText =
    'error' in summary && summary.error
      ? summary.error
      : [
          ...(summary.version
            ? [`${t('options.market.version')}: ${summary.version}`]
            : []),
          summary.compatible
            ? t('options.market.available')
            : t('options.market.incompatible'),
          t('options.market.sourceClients', {
            count: summary.clients.length
          })
        ].join(' · ')

  return (
    <ListItem disablePadding>
      <ListItemButton
        onClick={onEdit}
        {...bind}
        sx={{
          minHeight: 56,
          px: 1.25,
          py: 0.75,
          alignItems: 'center'
        }}
      >
        <ListItemText
          primary={primaryText}
          secondary={secondaryText}
          primaryTypographyProps={{
            variant: 'body2',
            fontWeight: 600,
            noWrap: true
          }}
          secondaryTypographyProps={{
            variant: 'caption',
            color:
              'error' in summary && summary.error
                ? 'error.main'
                : 'text.secondary',
            noWrap: true
          }}
        />
        <Box
          sx={{
            pl: 1,
            width: 96,
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
                label={t('options.market.editSource')}
                onClick={(event) => {
                  event.stopPropagation()
                  onEdit()
                }}
              >
                <EditOutlined fontSize="small" />
              </ToolbarIcon>
              <ToolbarIcon
                label={t('options.market.removeSource')}
                tone="error"
                onClick={(event) => {
                  event.stopPropagation()
                  onRemove()
                }}
              >
                <DeleteOutlineOutlined fontSize="small" />
              </ToolbarIcon>
            </Stack>
          ) : (
            <Tooltip title={secondaryText}>
              <Box
                component="span"
                sx={{
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textAlign: 'right',
                  fontSize: 12,
                  color:
                    'error' in summary && summary.error
                      ? 'error.main'
                      : 'text.secondary'
                }}
              >
                {summary.source.kind === 'repository'
                  ? `${t('options.market.sourceMode.repository')}`
                  : `${t('options.market.sourceMode.direct')}`}
              </Box>
            </Tooltip>
          )}
        </Box>
      </ListItemButton>
    </ListItem>
  )
}
