import { Box, Button, Divider, ListItem, ListItemButton, ListItemText, Stack, Typography } from '@mui/material'

import type {
  ClientInvocationStats,
  InvocationOverviewRecentRecord,
  InvocationOverviewStats,
  InvocationRecord
} from '#~/background/shared.js'
import { useI18n } from '../../../../i18n/provider.js'
import {
  formatDateTime,
  formatDuration,
  formatPercent,
  INVOCATION_KIND_ORDER,
  kindLabel,
  statusLabel
} from './formatters.js'
import {
  InvocationListSurface,
  InvocationSectionTitle,
  InvocationSurface
} from './surfaces.js'

export function RecentActivityHeader({
  clearDisabled,
  onClearHistory,
  onToggleFailures,
  showRecentFailuresOnly
}: {
  clearDisabled: boolean
  onClearHistory?: () => void
  onToggleFailures: () => void
  showRecentFailuresOnly: boolean
}) {
  const { t } = useI18n()

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={0.75}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent="space-between"
    >
      <InvocationSectionTitle>
        {t('options.invocations.recentCalls')}
      </InvocationSectionTitle>
      <Stack direction="row" spacing={0.75}>
        <Button
          size="small"
          variant={showRecentFailuresOnly ? 'contained' : 'outlined'}
          onClick={onToggleFailures}
        >
          {showRecentFailuresOnly
            ? t('options.invocations.showAllRecent')
            : t('options.invocations.onlyFailures')}
        </Button>
        {onClearHistory ? (
          <Button
            size="small"
            color="inherit"
            disabled={clearDisabled}
            onClick={onClearHistory}
          >
            {t('options.invocations.clearHistory')}
          </Button>
        ) : null}
      </Stack>
    </Stack>
  )
}

export function ClientBreakdownList({
  clients,
  onOpenClientActivity
}: {
  clients: InvocationOverviewStats['clients']
  onOpenClientActivity?: (clientKey: string) => void
}) {
  const { t } = useI18n()

  return (
    <Stack spacing={1}>
      <InvocationSectionTitle>{t('options.invocations.clients')}</InvocationSectionTitle>
      <InvocationListSurface>
        {clients.map((client, index) => (
          <Box key={client.clientKey}>
            {index > 0 ? <Divider /> : null}
            <ListItem
              disablePadding
              secondaryAction={
                onOpenClientActivity ? (
                  <Button
                    size="small"
                    onClick={() => onOpenClientActivity(client.clientKey)}
                  >
                    {t('options.invocations.openActivity')}
                  </Button>
                ) : null
              }
            >
              <ListItemButton
                disabled={!onOpenClientActivity}
                onClick={() => onOpenClientActivity?.(client.clientKey)}
              >
                <ListItemText
                  primary={client.clientName}
                  secondary={`${client.totalCount} · ${formatDuration(client.averageDurationMs)} · ${formatPercent(client.successCount, client.totalCount)}`}
                  primaryTypographyProps={{
                    variant: 'body2',
                    fontWeight: 600,
                    noWrap: true
                  }}
                  secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                />
              </ListItemButton>
            </ListItem>
          </Box>
        ))}
      </InvocationListSurface>
    </Stack>
  )
}

export function KindBreakdown({
  stats
}: {
  stats: ClientInvocationStats
}) {
  const { t } = useI18n()

  return (
    <Stack spacing={1}>
      <InvocationSectionTitle>
        {t('options.invocations.kindBreakdown')}
      </InvocationSectionTitle>
      <Stack spacing={0.75}>
        {INVOCATION_KIND_ORDER.map((kind) => {
          const item = stats.byKind.find((entry) => entry.kind === kind)

          if (!item) {
            return null
          }

          return (
            <InvocationSurface
              key={kind}
              sx={{
                px: 1.25,
                py: 1
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {t(`options.invocations.kind.${kind}`)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {`${item.totalCount} · ${formatDuration(item.averageDurationMs)}`}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {`${t('options.invocations.status.success')} ${item.successCount} · ${t('options.invocations.status.error')} ${item.errorCount}`}
              </Typography>
            </InvocationSurface>
          )
        })}
      </Stack>
    </Stack>
  )
}

export function RecentInvocationList({
  emptyLabel,
  items,
  showClientName = false
}: {
  emptyLabel: string
  items: InvocationRecord[] | InvocationOverviewRecentRecord[]
  showClientName?: boolean
}) {
  const { t } = useI18n()

  return (
    <Stack spacing={1}>
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {emptyLabel}
        </Typography>
      ) : (
        <InvocationListSurface>
          {items.map((item, index) => {
            const metaLine = `${statusLabel(t, item.status)} · ${formatDuration(item.durationMs)} · ${formatDateTime(item.finishedAt)}`

            return (
              <Box key={`${item.requestId}:${item.finishedAt}`}>
                {index > 0 ? <Divider /> : null}
                <ListItem sx={{ px: 1.25, py: 0.75 }}>
                <ListItemText
                  primary={`${kindLabel(t, item.kind)} · ${item.target}`}
                  secondary={
                    <Stack spacing={0.25} sx={{ pt: 0.125 }}>
                        {showClientName && 'clientName' in item ? (
                          <Typography variant="caption" color="text.secondary">
                            {item.clientName}
                          </Typography>
                        ) : null}
                        <Typography
                          variant="caption"
                          color={
                            item.status === 'error'
                              ? 'error.main'
                              : 'text.secondary'
                          }
                        >
                          {metaLine}
                        </Typography>
                        {item.errorMessage ? (
                          <Typography variant="caption" color="error.main">
                            {item.errorMessage}
                          </Typography>
                        ) : null}
                      </Stack>
                    }
                  primaryTypographyProps={{
                    variant: 'body2',
                    fontWeight: 600,
                    noWrap: true
                  }}
                  secondaryTypographyProps={{
                    component: 'div'
                  }}
                />
              </ListItem>
            </Box>
            )
          })}
        </InvocationListSurface>
      )}
    </Stack>
  )
}
