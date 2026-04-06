import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import FolderOutlined from '@mui/icons-material/FolderOutlined'
import { Box, ButtonBase, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

import { renderHighlightedText } from '../helpers.js'
import type { AssetBreadcrumb, AssetScopeEntry } from '../types.js'

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
                    borderRadius: 1,
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
