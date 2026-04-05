import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import FolderOutlined from '@mui/icons-material/FolderOutlined'
import { Box, ButtonBase, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material'
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'

import { renderHighlightedText } from './helpers.js'
import type {
  AssetBreadcrumb,
  AssetScopeEntry
} from './types.js'

export function AssetTreeLabel({
  action,
  dropActive = false,
  label,
  onClick,
  selected: _selected = false,
  searchTerm
}: {
  action?: ReactNode
  dropActive?: boolean
  label: ReactNode
  onClick?: (event: ReactMouseEvent<HTMLDivElement>) => void
  selected?: boolean
  searchTerm?: string
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        minWidth: 0,
        width: '100%',
        bgcolor: dropActive ? 'action.hover' : undefined
      }}
    >
      <Box
        onMouseDown={(event) => {
          if (event.button === 2) {
            event.preventDefault()
          }
        }}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onClick?.(event)
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          minWidth: 0,
          flex: 1
        }}
      >
        <FolderOutlined fontSize="small" />
        {typeof label === 'string' ? (
          <Typography variant="body2" noWrap sx={{ flex: 1, fontWeight: 600 }}>
            {renderHighlightedText(label, searchTerm)}
          </Typography>
        ) : (
          <Box sx={{ flex: 1, minWidth: 0 }}>{label}</Box>
        )}
      </Box>
      {action ? (
        <Box
          className="asset-tree-actions"
          onPointerDownCapture={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onClickCapture={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onMouseDown={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
        >
          {action}
        </Box>
      ) : null}
    </Box>
  )
}

export function AssetTreeLeaf({
  action,
  dragging = false,
  dropActive = false,
  icon,
  label,
  onClick,
  selected: _selected = false
}: {
  action?: ReactNode
  dragging?: boolean
  dropActive?: boolean
  icon: ReactNode
  label: ReactNode
  onClick?: (event: ReactMouseEvent<HTMLDivElement>) => void
  selected?: boolean
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        minWidth: 0,
        width: '100%',
        opacity: dragging ? 0.45 : 1,
        bgcolor: dropActive ? 'action.hover' : undefined
      }}
    >
      <Box
        onMouseDown={(event) => {
          if (event.button === 2) {
            event.preventDefault()
          }
        }}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onClick?.(event)
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          minWidth: 0,
          flex: 1
        }}
      >
        {icon}
        <Box sx={{ flex: 1, minWidth: 0 }}>{label}</Box>
      </Box>
      {action ? (
        <Box
          className="asset-tree-actions"
          onPointerDownCapture={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onClickCapture={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onMouseDown={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
        >
          {action}
        </Box>
      ) : null}
    </Box>
  )
}

export function AssetTreeAction({
  children,
  label,
  onClick
}: {
  children: ReactNode
  label: string
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <Tooltip title={label}>
      <IconButton
        aria-label={label}
        size="small"
        onClick={(event) => {
          event.stopPropagation()
          onClick(event)
        }}
        sx={{
          width: 20,
          height: 20,
          color: 'text.secondary'
        }}
      >
        {children}
      </IconButton>
    </Tooltip>
  )
}

export function AssetTreeRenameField({
  error,
  onCancel,
  onChange,
  onCommit,
  value
}: {
  error: boolean
  onCancel: () => void
  onChange: (value: string) => void
  onCommit: () => void
  value: string
}) {
  return (
    <TextField
      autoFocus
      error={error}
      size="small"
      variant="standard"
      value={value}
      onBlur={() => {
        if (error) {
          onCancel()
          return
        }

        onCommit()
      }}
      onChange={(event) => onChange(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation()

        if (event.key === 'Enter') {
          event.preventDefault()
          if (!error) {
            onCommit()
          }
        }

        if (event.key === 'Escape') {
          event.preventDefault()
          onCancel()
        }
      }}
      sx={{
        '& .MuiInputBase-root': {
          fontSize: 14
        },
        minWidth: 0
      }}
    />
  )
}

export function AssetContextHeader({
  breadcrumbs,
  onOpenItem,
  path,
  title
}: {
  breadcrumbs?: AssetBreadcrumb[]
  onOpenItem?: (itemId: string) => void
  path?: string
  title: string
}) {
  return (
    <Stack spacing={0.25} sx={{ pb: 1 }}>
      <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 0.5,
            minWidth: 0
          }}
        >
          {breadcrumbs.map((breadcrumb, index) => (
            <Box
              key={breadcrumb.itemId}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                minWidth: 0
              }}
            >
              {index > 0 ? (
                <Typography variant="caption" color="text.secondary">
                  /
                </Typography>
              ) : null}
              {onOpenItem ? (
                <ButtonBase
                  onClick={() => onOpenItem(breadcrumb.itemId)}
                  sx={{
                    minWidth: 0,
                    color: 'text.secondary',
                    justifyContent: 'flex-start',
                    borderRadius: 0.5,
                    px: 0.25
                  }}
                >
                  <Typography variant="caption" noWrap>
                    {breadcrumb.label}
                  </Typography>
                </ButtonBase>
              ) : (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {breadcrumb.label}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      ) : path ? (
        <Typography variant="caption" color="text.secondary" noWrap>
          {path}
        </Typography>
      ) : null}
    </Stack>
  )
}

export function AssetEmptyState({
  actions,
  label,
  minHeight = 360
}: {
  actions?: ReactNode
  label: string
  minHeight?: number
}) {
  return (
    <Stack
      spacing={1.25}
      justifyContent="center"
      alignItems="flex-start"
      sx={{
        minHeight,
        px: 0,
        py: 1
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      {actions}
    </Stack>
  )
}

export function AssetScopePanel({
  breadcrumbs,
  emptyLabel,
  entries,
  hideContextHeader = false,
  hideParentEntry = false,
  onOpenItem,
  openParentLabel,
  parentItemId,
  path,
  searchTerm,
  title
}: {
  breadcrumbs?: AssetBreadcrumb[]
  emptyLabel: string
  entries: AssetScopeEntry[]
  hideContextHeader?: boolean
  hideParentEntry?: boolean
  onOpenItem: (itemId: string) => void
  openParentLabel: string
  parentItemId?: string
  path?: string
  searchTerm?: string
  title: string
}) {
  if (entries.length === 0) {
    return (
      <Stack spacing={1.25} sx={{ minWidth: 0 }}>
        {!hideContextHeader ? (
          <AssetContextHeader
            breadcrumbs={breadcrumbs}
            onOpenItem={onOpenItem}
            path={path}
            title={title}
          />
        ) : null}
        {!hideParentEntry && parentItemId ? (
          <AssetScopeParentEntry
            itemId={parentItemId}
            label={openParentLabel}
            onOpenItem={onOpenItem}
          />
        ) : null}
        <AssetEmptyState label={emptyLabel} />
      </Stack>
    )
  }

  return (
    <Stack spacing={1.25} sx={{ minWidth: 0 }}>
      {!hideContextHeader ? (
        <AssetContextHeader
          breadcrumbs={breadcrumbs}
          onOpenItem={onOpenItem}
          path={path}
          title={title}
        />
      ) : null}
      <Stack spacing={0}>
        {!hideParentEntry && parentItemId ? (
          <AssetScopeParentEntry
            itemId={parentItemId}
            label={openParentLabel}
            onOpenItem={onOpenItem}
          />
        ) : null}
        {entries.map((item) => (
          <ButtonBase
            key={item.itemId}
            onClick={() => onOpenItem(item.itemId)}
            sx={{
              alignItems: 'stretch',
              borderBottom: '1px solid',
              borderColor: 'divider',
              justifyContent: 'flex-start',
              px: 0,
              py: 1,
              textAlign: 'left',
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                minWidth: 0,
                width: '100%'
              }}
            >
              {item.kind === 'folder' ? (
                <FolderOutlined fontSize="small" color="action" />
              ) : (
                <DescriptionOutlined fontSize="small" color="action" />
              )}
              <Stack spacing={0.25} sx={{ minWidth: 0, width: '100%' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {renderHighlightedText(item.title, searchTerm)}
                </Typography>
                {item.subtitle ? (
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {renderHighlightedText(item.subtitle, searchTerm)}
                  </Typography>
                ) : null}
              </Stack>
            </Box>
          </ButtonBase>
        ))}
      </Stack>
    </Stack>
  )
}

function AssetScopeParentEntry({
  itemId,
  label,
  onOpenItem
}: {
  itemId: string
  label: string
  onOpenItem: (itemId: string) => void
}) {
  return (
    <ButtonBase
      aria-label={label}
      onClick={() => onOpenItem(itemId)}
      sx={{
        alignItems: 'stretch',
        borderBottom: '1px solid',
        borderColor: 'divider',
        justifyContent: 'flex-start',
        px: 0,
        py: 1,
        textAlign: 'left',
        '&:hover': {
          bgcolor: 'action.hover'
        }
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          minWidth: 0,
          width: '100%'
        }}
      >
        <ArrowBackOutlined fontSize="small" color="action" />
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          ..
        </Typography>
      </Box>
    </ButtonBase>
  )
}
