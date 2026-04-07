import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import {
  alpha,
  Box,
  Button,
  ListItem,
  ListItemButton,
  ListItemText,
  Popover,
  Stack,
  Tooltip
} from '@mui/material'
import { useState, type MouseEvent as ReactMouseEvent } from 'react'

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
  const [deleteAnchor, setDeleteAnchor] = useState<HTMLElement | null>(null)
  const { actionControlsVisible, bind } = useDelayedHoverActions({
    forcedVisible: Boolean(deleteAnchor)
  })
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
  const modeLabel =
    summary.source.kind === 'repository'
      ? t('options.market.sourceMode.repository')
      : t('options.market.sourceMode.direct')
  const confirmDeleteOpen = Boolean(deleteAnchor)

  async function handleCopySource(event: ReactMouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    await navigator.clipboard.writeText(summary.source.url)
  }

  function handleRequestRemove(event: ReactMouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    setDeleteAnchor(event.currentTarget)
  }

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
            width: 132,
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
                label={t('options.market.copySource')}
                onClick={(event) => {
                  void handleCopySource(event)
                }}
              >
                <ContentCopyOutlined fontSize="small" />
              </ToolbarIcon>
              <ToolbarIcon
                label={t('options.market.removeSource')}
                tone="error"
                onClick={handleRequestRemove}
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
                  fontWeight: 600,
                  color:
                    'error' in summary && summary.error
                      ? 'error.main'
                      : 'text.secondary'
                }}
              >
                {modeLabel}
              </Box>
            </Tooltip>
          )}
        </Box>
      </ListItemButton>

      <Popover
        open={confirmDeleteOpen}
        anchorEl={deleteAnchor}
        onClose={() => setDeleteAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Stack spacing={1} sx={{ p: 1.25, maxWidth: 300 }}>
          <Box sx={{ fontSize: 14, fontWeight: 700 }}>
            {t('options.market.confirmRemoveSource.title')}
          </Box>
          <Box sx={{ fontSize: 14 }}>
            {t('options.market.confirmRemoveSource.body', {
              title: summary.title
            })}
          </Box>
          <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('options.market.confirmRemoveSource.hint')}
          </Box>
          <Stack
            direction="row"
            justifyContent="flex-end"
            spacing={1}
            sx={{ pt: 0.5 }}
          >
            <Button size="small" onClick={() => setDeleteAnchor(null)}>
              {t('options.market.confirmRemoveSource.cancel')}
            </Button>
            <Button
              size="small"
              color="error"
              variant="contained"
              onClick={() => {
                setDeleteAnchor(null)
                onRemove()
              }}
              sx={{
                '&:hover': {
                  backgroundColor: (theme) => alpha(theme.palette.error.main, 0.9)
                }
              }}
            >
              {t('options.market.confirmRemoveSource.confirm')}
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </ListItem>
  )
}
