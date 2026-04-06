import type {
  ClientInvocationStats,
  InvocationCapabilityKind,
  InvocationOverviewStats,
  InvocationRecord
} from '#~/background/shared.js'
export { formatDateTime, formatTimeLabel } from '../format-date-time.js'

export const INVOCATION_KIND_ORDER: InvocationCapabilityKind[] = [
  'endpoint',
  'prompt',
  'skill'
]

export function createEmptyStats(): ClientInvocationStats {
  return {
    totalCount: 0,
    successCount: 0,
    errorCount: 0,
    totalDurationMs: 0,
    averageDurationMs: 0,
    byKind: INVOCATION_KIND_ORDER.map((kind) => ({
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

export function createEmptyOverview(): InvocationOverviewStats {
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

export function formatDuration(durationMs: number | undefined): string {
  if (durationMs === undefined) {
    return '—'
  }

  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(durationMs >= 10_000 ? 0 : 1)} s`
  }

  return `${durationMs.toFixed(durationMs >= 100 ? 0 : 1)} ms`
}

export function formatPercent(successCount: number, totalCount: number): string {
  if (totalCount === 0) {
    return '0%'
  }

  return `${Math.round((successCount / totalCount) * 100)}%`
}

export function formatBarValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function shortenLabel(value: string, maxLength: number): string {
  return value.length > maxLength
    ? `${value.slice(0, maxLength - 1)}…`
    : value
}

export function statusLabel(
  t: (key: string, values?: Record<string, string | number>) => string,
  status: InvocationRecord['status']
): string {
  return t(`options.invocations.status.${status}`)
}

export function kindLabel(
  t: (key: string, values?: Record<string, string | number>) => string,
  kind: InvocationCapabilityKind
): string {
  return t(`options.invocations.kind.${kind}`)
}
