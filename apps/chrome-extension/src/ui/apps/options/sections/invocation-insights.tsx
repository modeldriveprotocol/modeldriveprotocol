import { Box, Button, Divider, List, ListItem, ListItemButton, ListItemText, Stack, Typography } from '@mui/material'
import { useState } from 'react'

import type {
  ClientInvocationStats,
  InvocationCapabilityKind,
  InvocationOverviewRecentRecord,
  InvocationOverviewStats,
  InvocationRecord
} from '#~/background/shared.js'
import { useI18n } from '../../../i18n/provider.js'

const KIND_ORDER: InvocationCapabilityKind[] = ['endpoint', 'prompt', 'skill']

export function ClientInvocationPanel({
  description,
  onClearHistory,
  stats
}: {
  description?: string
  onClearHistory?: () => void
  stats: ClientInvocationStats | undefined
}) {
  const { t } = useI18n()
  const telemetry = stats ?? createEmptyStats()
  const hasData = telemetry.totalCount > 0
  const [showRecentFailuresOnly, setShowRecentFailuresOnly] = useState(false)
  const recentItems = telemetry.recentInvocations.filter(
    (item) => !showRecentFailuresOnly || item.status === 'error'
  )

  return (
    <Stack spacing={1.5}>
      {description ? (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      ) : null}

      <SummaryGrid
        items={[
          {
            label: t('options.invocations.totalCalls'),
            value: String(telemetry.totalCount)
          },
          {
            label: t('options.invocations.failures'),
            value: String(telemetry.errorCount),
            tone: telemetry.errorCount > 0 ? 'error.main' : 'text.primary'
          },
          {
            label: t('options.invocations.successRate'),
            value: formatPercent(telemetry.successCount, telemetry.totalCount)
          },
          {
            label: t('options.invocations.averageDuration'),
            value: formatDuration(telemetry.averageDurationMs)
          }
        ]}
      />

      <SummaryGrid
        items={[
          {
            label: t('options.invocations.maxDuration'),
            value: formatDuration(telemetry.maxDurationMs)
          },
          {
            label: t('options.invocations.lastCall'),
            value: formatDateTime(telemetry.lastInvokedAt)
          }
        ]}
        columns={{ xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }}
      />

      {hasData ? (
        <>
          <KindBreakdown stats={telemetry} />
          <RecentActivityHeader
            clearDisabled={!hasData}
            onClearHistory={onClearHistory}
            onToggleFailures={() => setShowRecentFailuresOnly((current) => !current)}
            showRecentFailuresOnly={showRecentFailuresOnly}
          />
          {recentItems.length > 0 ? (
            <SimpleBarChart
              title={t('options.invocations.recentDurations')}
              items={[...recentItems].reverse().map((invocation) => ({
                key: invocation.requestId,
                label: formatTimeLabel(invocation.finishedAt),
                value: invocation.durationMs,
                helper: shortenLabel(invocation.target, 14),
                tone: invocation.status === 'error' ? 'error.main' : 'primary.main'
              }))}
            />
          ) : null}
          <RecentInvocationList
            items={recentItems}
            emptyLabel={showRecentFailuresOnly ? t('options.invocations.noFailures') : t('options.invocations.noData')}
          />
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t('options.invocations.noData')}
        </Typography>
      )}
    </Stack>
  )
}

export function WorkspaceInvocationOverview({
  onClearHistory,
  onOpenClientActivity,
  overview
}: {
  onClearHistory?: () => void
  onOpenClientActivity?: (clientKey: string) => void
  overview: InvocationOverviewStats | undefined
}) {
  const { t } = useI18n()
  const telemetry = overview ?? createEmptyOverview()
  const hasData = telemetry.totalCount > 0
  const [showRecentFailuresOnly, setShowRecentFailuresOnly] = useState(false)
  const recentItems = telemetry.recentInvocations.filter(
    (item) => !showRecentFailuresOnly || item.status === 'error'
  )

  return (
    <Stack spacing={1.5}>
      <SummaryGrid
        items={[
          {
            label: t('options.invocations.totalCalls'),
            value: String(telemetry.totalCount)
          },
          {
            label: t('options.invocations.activeClients'),
            value: String(telemetry.activeClientCount)
          },
          {
            label: t('options.invocations.successRate'),
            value: formatPercent(telemetry.successCount, telemetry.totalCount)
          },
          {
            label: t('options.invocations.averageDuration'),
            value: formatDuration(telemetry.averageDurationMs)
          }
        ]}
      />

      {hasData ? (
        <>
          <SimpleBarChart
            title={t('options.invocations.clientVolume')}
            items={telemetry.clients.map((client) => ({
              key: client.clientKey,
              label: shortenLabel(client.clientName, 14),
              value: client.totalCount,
              helper: formatDuration(client.averageDurationMs),
              tone: client.errorCount > 0 ? 'warning.main' : 'primary.main',
              onClick: onOpenClientActivity
                ? () => onOpenClientActivity(client.clientKey)
                : undefined
            }))}
          />

          <ClientBreakdownList
            clients={telemetry.clients}
            onOpenClientActivity={onOpenClientActivity}
          />

          <RecentActivityHeader
            clearDisabled={!hasData}
            onClearHistory={onClearHistory}
            onToggleFailures={() => setShowRecentFailuresOnly((current) => !current)}
            showRecentFailuresOnly={showRecentFailuresOnly}
          />
          {recentItems.length > 0 ? (
            <SimpleBarChart
              title={t('options.invocations.recentDurations')}
              items={[...recentItems].reverse().map((invocation) => ({
                key: `${invocation.clientKey}:${invocation.requestId}`,
                label: formatTimeLabel(invocation.finishedAt),
                value: invocation.durationMs,
                helper: shortenLabel(invocation.clientName, 12),
                tone: invocation.status === 'error' ? 'error.main' : 'primary.main'
              }))}
            />
          ) : null}

          <RecentInvocationList
            items={recentItems}
            emptyLabel={showRecentFailuresOnly ? t('options.invocations.noFailures') : t('options.invocations.noData')}
            showClientName
          />
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t('options.invocations.noData')}
        </Typography>
      )}
    </Stack>
  )
}

function RecentActivityHeader({
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
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {t('options.invocations.recentCalls')}
      </Typography>
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

function SummaryGrid({
  columns = { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
  items
}: {
  columns?: Record<string, string>
  items: Array<{
    label: string
    value: string
    tone?: string
  }>
}) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: columns, gap: 1 }}>
      {items.map((item) => (
        <Box
          key={item.label}
          sx={{
            px: 1.25,
            py: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '12px',
            bgcolor: 'background.paper'
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {item.label}
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, color: item.tone ?? 'text.primary' }}
          >
            {item.value}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

function SimpleBarChart({
  items,
  title
}: {
  items: Array<{
    key: string
    label: string
    value: number
    helper?: string
    onClick?: () => void
    tone?: string
  }>
  title: string
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1)

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '12px',
          p: 1.25,
          overflowX: 'auto'
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridAutoFlow: 'column',
            gridAutoColumns: 'minmax(44px, 1fr)',
            gap: 1,
            alignItems: 'end',
            minHeight: 160,
            minWidth: Math.max(items.length * 58, 240)
          }}
        >
          {items.map((item) => (
            <Stack
              key={item.key}
              component={item.onClick ? 'button' : 'div'}
              spacing={0.5}
              justifyContent="flex-end"
              onClick={item.onClick}
              sx={{
                minWidth: 0,
                height: '100%',
                border: 'none',
                bgcolor: 'transparent',
                p: 0,
                textAlign: 'inherit',
                cursor: item.onClick ? 'pointer' : 'default'
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                {formatBarValue(item.value)}
              </Typography>
              <Box
                sx={{
                  height: `${Math.max(14, (item.value / maxValue) * 88)}px`,
                  borderRadius: '10px 10px 6px 6px',
                  bgcolor: item.tone ?? 'primary.main',
                  opacity: item.value === 0 ? 0.35 : 1
                }}
              />
              <Typography variant="caption" noWrap sx={{ textAlign: 'center' }}>
                {item.label}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ textAlign: 'center' }}>
                {item.helper ?? ' '}
              </Typography>
            </Stack>
          ))}
        </Box>
      </Box>
    </Stack>
  )
}

function ClientBreakdownList({
  clients,
  onOpenClientActivity
}: {
  clients: InvocationOverviewStats['clients']
  onOpenClientActivity?: (clientKey: string) => void
}) {
  const { t } = useI18n()

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {t('options.invocations.clients')}
      </Typography>
      <List
        disablePadding
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      >
        {clients.map((client, index) => (
          <Box key={client.clientKey}>
            {index > 0 ? <Divider /> : null}
            <ListItem
              disablePadding
              secondaryAction={
                onOpenClientActivity ? (
                  <Button size="small" onClick={() => onOpenClientActivity(client.clientKey)}>
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
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
                  secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                />
              </ListItemButton>
            </ListItem>
          </Box>
        ))}
      </List>
    </Stack>
  )
}

function KindBreakdown({
  stats
}: {
  stats: ClientInvocationStats
}) {
  const { t } = useI18n()

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {t('options.invocations.kindBreakdown')}
      </Typography>
      <Stack spacing={0.75}>
        {KIND_ORDER.map((kind) => {
          const item = stats.byKind.find((entry) => entry.kind === kind)

          if (!item) {
            return null
          }

          return (
            <Box
              key={kind}
              sx={{
                px: 1.25,
                py: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '12px'
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
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
            </Box>
          )
        })}
      </Stack>
    </Stack>
  )
}

function RecentInvocationList({
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
        <List
          disablePadding
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '12px',
            overflow: 'hidden'
          }}
        >
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
                          color={item.status === 'error' ? 'error.main' : 'text.secondary'}
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
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
                  />
                </ListItem>
              </Box>
            )
          })}
        </List>
      )}
    </Stack>
  )
}

function createEmptyStats(): ClientInvocationStats {
  return {
    totalCount: 0,
    successCount: 0,
    errorCount: 0,
    totalDurationMs: 0,
    averageDurationMs: 0,
    byKind: KIND_ORDER.map((kind) => ({
      kind,
      totalCount: 0,
      successCount: 0,
      errorCount: 0,
      totalDurationMs: 0,
      averageDurationMs: 0
    })),
    recentInvocations: []
  }
}

function createEmptyOverview(): InvocationOverviewStats {
  return {
    totalCount: 0,
    successCount: 0,
    errorCount: 0,
    totalDurationMs: 0,
    averageDurationMs: 0,
    activeClientCount: 0,
    clients: [],
    recentInvocations: []
  }
}

function formatDuration(durationMs: number | undefined): string {
  if (durationMs === undefined) {
    return '—'
  }

  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(durationMs >= 10_000 ? 0 : 1)} s`
  }

  return `${durationMs.toFixed(durationMs >= 100 ? 0 : 1)} ms`
}

function formatPercent(successCount: number, totalCount: number): string {
  if (totalCount === 0) {
    return '0%'
  }

  return `${Math.round((successCount / totalCount) * 100)}%`
}

function formatDateTime(value: string | undefined): string {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    month: 'numeric',
    day: 'numeric'
  })
}

function formatBarValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function formatTimeLabel(value: string): string {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function shortenLabel(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value
}

function statusLabel(
  t: (key: string, values?: Record<string, string | number>) => string,
  status: InvocationRecord['status']
): string {
  return t(`options.invocations.status.${status}`)
}

function kindLabel(
  t: (key: string, values?: Record<string, string | number>) => string,
  kind: InvocationCapabilityKind
): string {
  return t(`options.invocations.kind.${kind}`)
}
