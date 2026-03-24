import type { CapabilityInvocationMiddleware } from '@modeldriveprotocol/client'

import type {
  ClientInvocationStats,
  InvocationCapabilityKind,
  InvocationKindStats,
  InvocationOverviewStats,
  InvocationResultStatus
} from '#~/background/shared.js'

const INVOCATION_KIND_ORDER: InvocationCapabilityKind[] = ['tool', 'prompt', 'skill', 'resource']
const MAX_RECENT_INVOCATIONS_PER_CLIENT = 16
const MAX_RECENT_INVOCATIONS_OVERVIEW = 20

type MutableInvocationKindStats = Omit<InvocationKindStats, 'averageDurationMs'>

export interface ClientInvocationTelemetryState {
  totalCount: number
  successCount: number
  errorCount: number
  totalDurationMs: number
  minDurationMs?: number
  maxDurationMs?: number
  lastInvokedAt?: string
  lastStatus?: InvocationResultStatus
  lastDurationMs?: number
  lastTarget?: string
  lastErrorMessage?: string
  byKind: Record<InvocationCapabilityKind, MutableInvocationKindStats>
  recentInvocations: ClientInvocationStats['recentInvocations']
}

export function createInvocationTelemetryMiddleware(
  telemetry: Map<string, ClientInvocationTelemetryState>,
  clientKey: string,
  onRecorded?: () => void
): CapabilityInvocationMiddleware {
  return async (invocation, next) => {
    const startedAtMs = Date.now()
    const startedAt = new Date(startedAtMs).toISOString()
    const target = invocation.name ?? invocation.uri ?? 'unknown'

    try {
      const result = await next()
      recordInvocationTelemetry(telemetry, clientKey, {
        requestId: invocation.requestId,
        kind: invocation.kind,
        target,
        status: 'success',
        startedAt,
        finishedAtMs: Date.now()
      })
      onRecorded?.()
      return result
    } catch (error) {
      recordInvocationTelemetry(telemetry, clientKey, {
        requestId: invocation.requestId,
        kind: invocation.kind,
        target,
        status: 'error',
        startedAt,
        finishedAtMs: Date.now(),
        errorMessage: error instanceof Error ? error.message : String(error)
      })
      onRecorded?.()
      throw error
    }
  }
}

export function recordInvocationTelemetry(
  telemetry: Map<string, ClientInvocationTelemetryState>,
  clientKey: string,
  input: {
    requestId: string
    kind: InvocationCapabilityKind
    target: string
    status: InvocationResultStatus
    startedAt: string
    finishedAtMs: number
    errorMessage?: string
  }
): void {
  const state = ensureClientInvocationTelemetry(telemetry, clientKey)
  const startedAtMs = new Date(input.startedAt).getTime()
  const durationMs = Math.max(0, input.finishedAtMs - startedAtMs)
  const finishedAt = new Date(input.finishedAtMs).toISOString()

  state.totalCount += 1
  state.totalDurationMs += durationMs
  state.minDurationMs =
    state.minDurationMs === undefined ? durationMs : Math.min(state.minDurationMs, durationMs)
  state.maxDurationMs =
    state.maxDurationMs === undefined ? durationMs : Math.max(state.maxDurationMs, durationMs)
  state.lastInvokedAt = finishedAt
  state.lastStatus = input.status
  state.lastDurationMs = durationMs
  state.lastTarget = input.target
  state.lastErrorMessage = input.errorMessage

  if (input.status === 'success') {
    state.successCount += 1
  } else {
    state.errorCount += 1
  }

  const kindState = state.byKind[input.kind]
  kindState.totalCount += 1
  kindState.totalDurationMs += durationMs
  kindState.minDurationMs =
    kindState.minDurationMs === undefined
      ? durationMs
      : Math.min(kindState.minDurationMs, durationMs)
  kindState.maxDurationMs =
    kindState.maxDurationMs === undefined
      ? durationMs
      : Math.max(kindState.maxDurationMs, durationMs)

  if (input.status === 'success') {
    kindState.successCount += 1
  } else {
    kindState.errorCount += 1
  }

  state.recentInvocations.unshift({
    requestId: input.requestId,
    kind: input.kind,
    target: input.target,
    status: input.status,
    durationMs,
    startedAt: input.startedAt,
    finishedAt,
    ...(input.errorMessage ? { errorMessage: input.errorMessage } : {})
  })

  if (state.recentInvocations.length > MAX_RECENT_INVOCATIONS_PER_CLIENT) {
    state.recentInvocations.length = MAX_RECENT_INVOCATIONS_PER_CLIENT
  }
}

export function pruneInvocationTelemetry(
  telemetry: Map<string, ClientInvocationTelemetryState>,
  validKeys: Iterable<string>
): void {
  const valid = new Set(validKeys)

  for (const key of telemetry.keys()) {
    if (!valid.has(key)) {
      telemetry.delete(key)
    }
  }
}

export function toClientInvocationStats(
  telemetry: ClientInvocationTelemetryState | undefined
): ClientInvocationStats {
  if (!telemetry) {
    return createEmptyClientInvocationStats()
  }

  return {
    totalCount: telemetry.totalCount,
    successCount: telemetry.successCount,
    errorCount: telemetry.errorCount,
    totalDurationMs: telemetry.totalDurationMs,
    averageDurationMs: averageDuration(telemetry.totalDurationMs, telemetry.totalCount),
    ...(telemetry.minDurationMs !== undefined
      ? { minDurationMs: telemetry.minDurationMs }
      : {}),
    ...(telemetry.maxDurationMs !== undefined
      ? { maxDurationMs: telemetry.maxDurationMs }
      : {}),
    ...(telemetry.lastInvokedAt ? { lastInvokedAt: telemetry.lastInvokedAt } : {}),
    ...(telemetry.lastStatus ? { lastStatus: telemetry.lastStatus } : {}),
    ...(telemetry.lastDurationMs !== undefined
      ? { lastDurationMs: telemetry.lastDurationMs }
      : {}),
    ...(telemetry.lastTarget ? { lastTarget: telemetry.lastTarget } : {}),
    ...(telemetry.lastErrorMessage ? { lastErrorMessage: telemetry.lastErrorMessage } : {}),
    byKind: INVOCATION_KIND_ORDER.map((kind) => {
      const kindState = telemetry.byKind[kind]
      return {
        kind,
        totalCount: kindState.totalCount,
        successCount: kindState.successCount,
        errorCount: kindState.errorCount,
        totalDurationMs: kindState.totalDurationMs,
        averageDurationMs: averageDuration(kindState.totalDurationMs, kindState.totalCount),
        ...(kindState.minDurationMs !== undefined
          ? { minDurationMs: kindState.minDurationMs }
          : {}),
        ...(kindState.maxDurationMs !== undefined
          ? { maxDurationMs: kindState.maxDurationMs }
          : {})
      }
    }),
    recentInvocations: [...telemetry.recentInvocations]
  }
}

export function buildInvocationOverview(
  clients: Array<{
    clientKey: string
    clientName: string
    invocationStats: ClientInvocationStats
  }>
): InvocationOverviewStats {
  const totalCount = clients.reduce((sum, client) => sum + client.invocationStats.totalCount, 0)
  const successCount = clients.reduce(
    (sum, client) => sum + client.invocationStats.successCount,
    0
  )
  const errorCount = clients.reduce(
    (sum, client) => sum + client.invocationStats.errorCount,
    0
  )
  const totalDurationMs = clients.reduce(
    (sum, client) => sum + client.invocationStats.totalDurationMs,
    0
  )
  const maxDurationMs = clients.reduce<number | undefined>((maxValue, client) => {
    if (client.invocationStats.maxDurationMs === undefined) {
      return maxValue
    }

    if (maxValue === undefined) {
      return client.invocationStats.maxDurationMs
    }

    return Math.max(maxValue, client.invocationStats.maxDurationMs)
  }, undefined)
  const lastInvokedAt = clients
    .map((client) => client.invocationStats.lastInvokedAt)
    .filter(Boolean)
    .sort()
    .at(-1)

  return {
    totalCount,
    successCount,
    errorCount,
    totalDurationMs,
    averageDurationMs: averageDuration(totalDurationMs, totalCount),
    ...(maxDurationMs !== undefined ? { maxDurationMs } : {}),
    ...(lastInvokedAt ? { lastInvokedAt } : {}),
    activeClientCount: clients.filter((client) => client.invocationStats.totalCount > 0).length,
    clients: [...clients]
      .map((client) => ({
        clientKey: client.clientKey,
        clientName: client.clientName,
        totalCount: client.invocationStats.totalCount,
        successCount: client.invocationStats.successCount,
        errorCount: client.invocationStats.errorCount,
        totalDurationMs: client.invocationStats.totalDurationMs,
        averageDurationMs: client.invocationStats.averageDurationMs,
        ...(client.invocationStats.maxDurationMs !== undefined
          ? { maxDurationMs: client.invocationStats.maxDurationMs }
          : {}),
        ...(client.invocationStats.lastInvokedAt
          ? { lastInvokedAt: client.invocationStats.lastInvokedAt }
          : {})
      }))
      .sort((left, right) => {
        if (left.totalCount !== right.totalCount) {
          return right.totalCount - left.totalCount
        }
        return left.clientName.localeCompare(right.clientName)
      }),
    recentInvocations: clients
      .flatMap((client) =>
        client.invocationStats.recentInvocations.map((invocation) => ({
          ...invocation,
          clientKey: client.clientKey,
          clientName: client.clientName
        }))
      )
      .sort((left, right) => right.finishedAt.localeCompare(left.finishedAt))
      .slice(0, MAX_RECENT_INVOCATIONS_OVERVIEW)
  }
}

function ensureClientInvocationTelemetry(
  telemetry: Map<string, ClientInvocationTelemetryState>,
  clientKey: string
): ClientInvocationTelemetryState {
  let state = telemetry.get(clientKey)

  if (!state) {
    state = createEmptyTelemetryState()
    telemetry.set(clientKey, state)
  }

  return state
}

function createEmptyTelemetryState(): ClientInvocationTelemetryState {
  return {
    totalCount: 0,
    successCount: 0,
    errorCount: 0,
    totalDurationMs: 0,
    byKind: {
      tool: createEmptyKindStats('tool'),
      prompt: createEmptyKindStats('prompt'),
      skill: createEmptyKindStats('skill'),
      resource: createEmptyKindStats('resource')
    },
    recentInvocations: []
  }
}

function createEmptyKindStats(kind: InvocationCapabilityKind): MutableInvocationKindStats {
  return {
    kind,
    totalCount: 0,
    successCount: 0,
    errorCount: 0,
    totalDurationMs: 0
  }
}

function createEmptyClientInvocationStats(): ClientInvocationStats {
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

function averageDuration(totalDurationMs: number, totalCount: number): number {
  if (totalCount === 0) {
    return 0
  }

  return Math.round((totalDurationMs / totalCount) * 10) / 10
}
