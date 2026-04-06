import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import MoreHorizOutlined from '@mui/icons-material/MoreHorizOutlined'
import PushPinOutlined from '@mui/icons-material/PushPinOutlined'
import StarBorderOutlined from '@mui/icons-material/StarBorderOutlined'
import StarOutlined from '@mui/icons-material/StarOutlined'
import {
  alpha,
  Box,
  Checkbox,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Switch,
  Tooltip
} from '@mui/material'
import { useRef, useState } from 'react'

import {
  canCreateRouteClientFromUrl,
  isRequiredBackgroundClientId,
  matchesRouteClient
} from '#~/shared/config.js'
import type { PopupState } from '#~/background/shared.js'
import { renderClientIcon } from '../../../../foundation/client-icons.js'
import { ToolbarIcon } from '../../shared.js'
import type { EditableClientId } from '../../types.js'
import { useDelayedHoverActions } from '../use-delayed-hover-actions.js'
import { formatDateTime } from '../format-date-time.js'
import type { ClientListItem } from './types.js'

export function ClientRow({
  currentPageUrl,
  draftBackgroundClientCount,
  isChecked,
  isSelected,
  item,
  onOpenDetail,
  onRequestDelete,
  onSelectClient,
  onDuplicateClient,
  onToggleEnabled,
  onToggleFavorite,
  onTogglePinned,
  onToggleSelected,
  selectionMode,
  runtimeState,
  t
}: {
  currentPageUrl: string | undefined
  draftBackgroundClientCount: number
  isChecked: boolean
  isSelected: boolean
  item: ClientListItem
  onOpenDetail: (clientId: EditableClientId) => void
  onRequestDelete: (clientId: EditableClientId, anchorEl: HTMLElement) => void
  onSelectClient: (clientId: EditableClientId) => void
  onDuplicateClient: (item: ClientListItem) => void
  onToggleEnabled: (clientId: EditableClientId, checked: boolean) => void
  onToggleFavorite: (clientId: EditableClientId) => void
  onTogglePinned: (clientId: EditableClientId) => void
  onToggleSelected: (clientId: EditableClientId, checked: boolean) => void
  selectionMode: boolean
  runtimeState: PopupState | undefined
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const moreButtonRef = useRef<HTMLButtonElement | null>(null)
  const matched =
    item.kind === 'route'
      ? Boolean(
          currentPageUrl &&
            canCreateRouteClientFromUrl(currentPageUrl) &&
            matchesRouteClient(currentPageUrl, item.client)
        )
      : false
  const runtimeClientState = runtimeState?.clients.find(
    (client) => client.kind === item.kind && client.id === item.id
  )
  const hasMatchingOpenTab =
    item.kind === 'route'
      ? (runtimeClientState?.matchingTabCount ?? 0) > 0
      : false
  const secondaryTone =
    item.kind === 'route'
      ? matched || hasMatchingOpenTab
        ? 'success.main'
        : 'text.secondary'
      : runtimeClientState?.connectionState === 'connected'
        ? 'success.main'
        : 'text.secondary'
  const secondaryText =
    item.kind === 'background'
      ? t('options.clients.type.background')
      : [
          t('options.clients.type.route'),
          matched
            ? t('options.clients.match')
            : hasMatchingOpenTab
              ? `${t('options.clients.active')} · ${t(
                  'options.clients.openTabs',
                  {
                    count: runtimeClientState?.matchingTabCount ?? 0
                  }
                )}`
              : t('options.clients.idle')
        ].join(' · ')
  const deleteDisabled =
    item.kind === 'background' &&
    (draftBackgroundClientCount <= 1 || isRequiredBackgroundClientId(item.id))
  const moreMenuOpen = Boolean(menuAnchor)
  const { actionControlsVisible, bind } = useDelayedHoverActions({
    forcedVisible: moreMenuOpen
  })
  const createdAtLabel = `${t('options.clients.createdAt')}${formatDateTime(
    item.client.createdAt
  )}`

  function closeMenu() {
    setMenuAnchor(null)
  }

  return (
    <ListItem disablePadding>
      <ListItemButton
        className="client-row-button"
        onClick={() => {
          onSelectClient(item.id)
          onOpenDetail(item.id)
        }}
        {...bind}
        sx={{
          minHeight: 60,
          px: 1.25,
          py: 0.75,
          alignItems: 'center'
        }}
      >
        {selectionMode ? (
          <Checkbox
            edge="start"
            size="small"
            checked={isChecked}
            onClick={(event) => event.stopPropagation()}
            onChange={(_event, checked) => onToggleSelected(item.id, checked)}
            sx={{ mr: 0.5 }}
          />
        ) : null}
        <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}>
          {renderClientIcon(item.client.icon)}
        </ListItemIcon>
        <ListItemText
          primary={item.client.clientName}
          secondary={secondaryText}
          primaryTypographyProps={{
            variant: 'body2',
            fontWeight: 600,
            noWrap: true
          }}
          secondaryTypographyProps={{
            variant: 'caption',
            noWrap: true,
            color: secondaryTone
          }}
        />
        <Box
          sx={{
            pl: 1,
            width: 136,
            flexShrink: 0,
            height: 30,
            position: 'relative'
          }}
        >
          <Box
            className="client-row-meta"
            sx={{
              position: 'absolute',
              inset: 0,
              display: actionControlsVisible ? 'none' : 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end'
            }}
          >
            <Tooltip title={createdAtLabel}>
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
                {createdAtLabel}
              </Box>
            </Tooltip>
          </Box>
          <Stack
            className="client-row-actions"
            direction="row"
            spacing={0.25}
            sx={{
              position: 'absolute',
              inset: 0,
              pl: 1,
              alignItems: 'center',
              justifyContent: 'flex-end',
              display: actionControlsVisible ? 'flex' : 'none'
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <Box sx={{ height: 30, display: 'inline-flex', alignItems: 'center' }}>
              <Switch
                size="small"
                checked={item.client.enabled}
                disabled={
                  item.kind === 'background' &&
                  isRequiredBackgroundClientId(item.id)
                }
                onChange={(_event, checked) => onToggleEnabled(item.id, checked)}
                sx={{ m: 0 }}
              />
            </Box>
            <ToolbarIcon
              label={
                item.client.favorite
                  ? t('options.clients.unfavorite')
                  : t('options.clients.favorite')
              }
              active={item.client.favorite}
              onClick={() => onToggleFavorite(item.id)}
              tone="warning"
            >
              {item.client.favorite ? (
                <StarOutlined fontSize="small" />
              ) : (
                <StarBorderOutlined fontSize="small" />
              )}
            </ToolbarIcon>
            <ToolbarIcon
              label={
                item.client.pinned
                  ? t('options.clients.unpin')
                  : t('options.clients.pin')
              }
              active={item.client.pinned}
              onClick={() => onTogglePinned(item.id)}
              tone="primary"
            >
              <PushPinOutlined fontSize="small" />
            </ToolbarIcon>
            <Tooltip title={t('options.clients.more')}>
              <span>
                <IconButton
                  ref={moreButtonRef}
                  size="small"
                  aria-label={t('options.clients.more')}
                  onClick={(event) => setMenuAnchor(event.currentTarget)}
                >
                  <MoreHorizOutlined fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Box>
      </ListItemButton>
      <Menu
        anchorEl={menuAnchor}
        open={moreMenuOpen}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            closeMenu()
            onDuplicateClient(item)
          }}
        >
          <ContentCopyOutlined fontSize="small" sx={{ mr: 1 }} />
          {t('options.clients.copy')}
        </MenuItem>
        <MenuItem
          disabled={deleteDisabled}
          onClick={() => {
            closeMenu()

            if (moreButtonRef.current) {
              onRequestDelete(item.id, moreButtonRef.current)
            }
          }}
          sx={
            deleteDisabled
              ? undefined
              : {
                  color: 'error.main',
                  '& .MuiSvgIcon-root': {
                    color: 'inherit'
                  },
                  '&:hover': {
                    backgroundColor: (theme) => alpha(theme.palette.error.main, 0.08)
                  }
                }
          }
        >
          <DeleteOutlineOutlined fontSize="small" sx={{ mr: 1 }} />
          {t('options.clients.delete')}
        </MenuItem>
      </Menu>
    </ListItem>
  )
}
