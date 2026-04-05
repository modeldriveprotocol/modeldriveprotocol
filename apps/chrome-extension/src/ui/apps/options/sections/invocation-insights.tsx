import { Stack, Typography } from '@mui/material'
import { useState } from 'react'

import type {
  ClientInvocationStats,
  InvocationOverviewStats
} from '#~/background/shared.js'
import { useI18n } from '../../../i18n/provider.js'
import {
  createEmptyOverview,
  createEmptyStats,
  formatDateTime,
  formatDuration,
  formatPercent,
  formatTimeLabel,
  shortenLabel
} from './invocation-insights/formatters.js'
import { SimpleBarChart } from './invocation-insights/simple-bar-chart.js'
import { SummaryGrid } from './invocation-insights/summary-grid.js'
import {
  ClientBreakdownList,
  KindBreakdown,
  RecentActivityHeader,
  RecentInvocationList
} from './invocation-insights/telemetry-sections.js'

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
        columns={{
          xs: 'repeat(2, minmax(0, 1fr))',
          md: 'repeat(4, minmax(0, 1fr))'
        }}
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
      />

      {hasData ? (
        <>
          <KindBreakdown stats={telemetry} />
          <RecentActivityHeader
            clearDisabled={!hasData}
            onClearHistory={onClearHistory}
            onToggleFailures={() =>
              setShowRecentFailuresOnly((current) => !current)
            }
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
                tone:
                  invocation.status === 'error' ? 'error.main' : 'primary.main'
              }))}
            />
          ) : null}
          <RecentInvocationList
            items={recentItems}
            emptyLabel={
              showRecentFailuresOnly
                ? t('options.invocations.noFailures')
                : t('options.invocations.noData')
            }
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
            onToggleFailures={() =>
              setShowRecentFailuresOnly((current) => !current)
            }
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
                tone:
                  invocation.status === 'error' ? 'error.main' : 'primary.main'
              }))}
            />
          ) : null}

          <RecentInvocationList
            items={recentItems}
            emptyLabel={
              showRecentFailuresOnly
                ? t('options.invocations.noFailures')
                : t('options.invocations.noData')
            }
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
