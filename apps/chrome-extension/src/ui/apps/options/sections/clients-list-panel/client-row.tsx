import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import StarBorderOutlined from '@mui/icons-material/StarBorderOutlined'
import StarOutlined from '@mui/icons-material/StarOutlined'
import {
  Checkbox,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Switch
} from '@mui/material'
import type { MouseEvent as ReactMouseEvent } from 'react'

import {
  canCreateRouteClientFromUrl,
  isRequiredBackgroundClientId,
  matchesRouteClient
} from '#~/shared/config.js'
import type { PopupState } from '#~/background/shared.js'
import { renderClientIcon } from '../../../../foundation/client-icons.js'
import { ToolbarIcon } from '../../shared.js'
import type { EditableClientId } from '../../types.js'
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
  onToggleEnabled,
  onToggleFavorite,
  onToggleSelected,
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
  onToggleEnabled: (clientId: EditableClientId, checked: boolean) => void
  onToggleFavorite: (clientId: EditableClientId) => void
  onToggleSelected: (clientId: EditableClientId, checked: boolean) => void
  runtimeState: PopupState | undefined
  t: (key: string, values?: Record<string, string | number>) => string
}) {
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

  return (
    <ListItem disablePadding>
      <ListItemButton
        selected={isSelected}
        onClick={() => {
          onSelectClient(item.id)
          onOpenDetail(item.id)
        }}
        sx={{
          minHeight: 60,
          px: 1.25,
          py: 0.75,
          alignItems: 'center',
          borderLeft: '2px solid',
          borderLeftColor: isSelected ? 'primary.main' : 'transparent'
        }}
      >
        <Checkbox
          edge="start"
          size="small"
          checked={isChecked}
          onClick={(event) => event.stopPropagation()}
          onChange={(_event, checked) => onToggleSelected(item.id, checked)}
          sx={{ mr: 0.5 }}
        />
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
        <Stack
          direction="row"
          spacing={0.25}
          sx={{ pl: 1 }}
          onClick={(event) => event.stopPropagation()}
        >
          <ToolbarIcon
            label={
              item.client.favorite
                ? t('options.clients.unfavorite')
                : t('options.clients.favorite')
            }
            onClick={() => onToggleFavorite(item.id)}
          >
            {item.client.favorite ? (
              <StarOutlined fontSize="small" />
            ) : (
              <StarBorderOutlined fontSize="small" />
            )}
          </ToolbarIcon>
          <Switch
            size="small"
            checked={item.client.enabled}
            disabled={
              item.kind === 'background' &&
              isRequiredBackgroundClientId(item.id)
            }
            onChange={(_event, checked) => onToggleEnabled(item.id, checked)}
          />
          {item.kind === 'route' || draftBackgroundClientCount > 1 ? (
            <ToolbarIcon
              label={t('options.clients.delete')}
              onClick={(event) =>
                onRequestDelete(
                  item.id,
                  (event as ReactMouseEvent<HTMLButtonElement>).currentTarget
                )
              }
              disabled={deleteDisabled}
            >
              <DeleteOutlineOutlined fontSize="small" />
            </ToolbarIcon>
          ) : null}
        </Stack>
      </ListItemButton>
    </ListItem>
  )
}
