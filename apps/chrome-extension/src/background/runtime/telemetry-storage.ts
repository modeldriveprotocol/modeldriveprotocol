import { readNumber, readString } from '#~/shared/utils.js'
import type {
  InvocationCapabilityKind,
  InvocationRecord,
  InvocationResultStatus
} from '#~/background/shared.js'

import type { ChromeExtensionRuntime } from '../runtime.js'
import type { ClientInvocationTelemetryState } from './telemetry.js'

const INVOCATION_TELEMETRY_STORAGE_KEY = 'invocationTelemetry'
const INVOCATION_TELEMETRY_PERSIST_DELAY_MS = 500
const INVOCATION_KIND_ORDER: InvocationCapabilityKind[] = ['tool', 'prompt', 'skill', 'resource']
const MAX_RECENT_INVOCATIONS_PER_CLIENT = 16

export async function ensureInvocationTelemetryLoaded(
  runtime: ChromeExtensionRuntime
): Promise<void> {
  if (runtime.telemetryLoaded) {
    return
  }

  runtime.telemetryLoaded = true

  const stored = (await chrome.storage.local.get(
    INVOCATION_TELEMETRY_STORAGE_KEY
  )) as Record<string, unknown>
  const rawTelemetry = stored[INVOCATION_TELEMETRY_STORAGE_KEY]

  if (!rawTelemetry || typeof rawTelemetry !== 'object' || Array.isArray(rawTelemetry)) {
    return
  }

  runtime.clientTelemetry.clear()

  for (const [clientKey, value] of Object.entries(rawTelemetry)) {
    const telemetry = parseClientInvocationTelemetryState(value)

    if (telemetry) {
      runtime.clientTelemetry.set(clientKey, telemetry)
    }
  }
}

export function scheduleInvocationTelemetryPersist(runtime: ChromeExtensionRuntime): void {
  if (runtime.telemetryPersistTimer !== undefined) {
    return
  }

  runtime.telemetryPersistTimer = globalThis.setTimeout(() => {
    runtime.telemetryPersistTimer = undefined
    void persistInvocationTelemetry(runtime)
  }, INVOCATION_TELEMETRY_PERSIST_DELAY_MS)
}

export async function clearInvocationTelemetry(
  runtime: ChromeExtensionRuntime,
  clientKey?: string
): Promise<void> {
  await ensureInvocationTelemetryLoaded(runtime)

  if (runtime.telemetryPersistTimer !== undefined) {
    globalThis.clearTimeout(runtime.telemetryPersistTimer)
    runtime.telemetryPersistTimer = undefined
  }

  if (clientKey) {
    runtime.clientTelemetry.delete(clientKey)
  } else {
    runtime.clientTelemetry.clear()
  }

  await persistInvocationTelemetry(runtime)
}

function serializeInvocationTelemetry(
  telemetry: Map<string, ClientInvocationTelemetryState>
): Record<string, ClientInvocationTelemetryState> {
  return Object.fromEntries(
    [...telemetry.entries()].map(([clientKey, state]) => [
      clientKey,
      {
        totalCount: state.totalCount,
        successCount: state.successCount,
        errorCount: state.errorCount,
        totalDurationMs: state.totalDurationMs,
        ...(state.minDurationMs !== undefined ? { minDurationMs: state.minDurationMs } : {}),
        ...(state.maxDurationMs !== undefined ? { maxDurationMs: state.maxDurationMs } : {}),
        ...(state.lastInvokedAt ? { lastInvokedAt: state.lastInvokedAt } : {}),
        ...(state.lastStatus ? { lastStatus: state.lastStatus } : {}),
        ...(state.lastDurationMs !== undefined ? { lastDurationMs: state.lastDurationMs } : {}),
        ...(state.lastTarget ? { lastTarget: state.lastTarget } : {}),
        ...(state.lastErrorMessage ? { lastErrorMessage: state.lastErrorMessage } : {}),
        byKind: Object.fromEntries(
          INVOCATION_KIND_ORDER.map((kind) => {
            const kindState = state.byKind[kind]
            return [
              kind,
              {
                kind,
                totalCount: kindState.totalCount,
                successCount: kindState.successCount,
                errorCount: kindState.errorCount,
                totalDurationMs: kindState.totalDurationMs,
                ...(kindState.minDurationMs !== undefined
                  ? { minDurationMs: kindState.minDurationMs }
                  : {}),
                ...(kindState.maxDurationMs !== undefined
                  ? { maxDurationMs: kindState.maxDurationMs }
                  : {})
              }
            ]
          })
        ) as ClientInvocationTelemetryState['byKind'],
        recentInvocations: state.recentInvocations.map((invocation) => ({
          ...invocation
        }))
      } satisfies ClientInvocationTelemetryState
    ])
  )
}

async function persistInvocationTelemetry(runtime: ChromeExtensionRuntime): Promise<void> {
  await chrome.storage.local.set({
    [INVOCATION_TELEMETRY_STORAGE_KEY]: serializeInvocationTelemetry(runtime.clientTelemetry)
  })
}

function parseClientInvocationTelemetryState(
  value: unknown
): ClientInvocationTelemetryState | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  const record = value as Record<string, unknown>
  const totalCount = readNumber(record, 'totalCount')
  const successCount = readNumber(record, 'successCount')
  const errorCount = readNumber(record, 'errorCount')
  const totalDurationMs = readNumber(record, 'totalDurationMs')

  if (
    totalCount === undefined ||
    successCount === undefined ||
    errorCount === undefined ||
    totalDurationMs === undefined
  ) {
    return undefined
  }

  const byKindRecord =
    record.byKind && typeof record.byKind === 'object' && !Array.isArray(record.byKind)
      ? (record.byKind as Record<string, unknown>)
      : undefined

  const byKind = Object.fromEntries(
    INVOCATION_KIND_ORDER.map((kind) => [
      kind,
      parseInvocationKindStats(kind, byKindRecord?.[kind])
    ])
  ) as ClientInvocationTelemetryState['byKind']

  return {
    totalCount,
    successCount,
    errorCount,
    totalDurationMs,
    ...(readNumber(record, 'minDurationMs') !== undefined
      ? { minDurationMs: readNumber(record, 'minDurationMs') }
      : {}),
    ...(readNumber(record, 'maxDurationMs') !== undefined
      ? { maxDurationMs: readNumber(record, 'maxDurationMs') }
      : {}),
    ...(readString(record, 'lastInvokedAt') ? { lastInvokedAt: readString(record, 'lastInvokedAt') } : {}),
    ...(isInvocationResultStatus(record.lastStatus) ? { lastStatus: record.lastStatus } : {}),
    ...(readNumber(record, 'lastDurationMs') !== undefined
      ? { lastDurationMs: readNumber(record, 'lastDurationMs') }
      : {}),
    ...(readString(record, 'lastTarget') ? { lastTarget: readString(record, 'lastTarget') } : {}),
    ...(readString(record, 'lastErrorMessage')
      ? { lastErrorMessage: readString(record, 'lastErrorMessage') }
      : {}),
    byKind,
    recentInvocations: Array.isArray(record.recentInvocations)
      ? record.recentInvocations
          .map((invocation) => parseInvocationRecord(invocation))
          .filter((invocation): invocation is InvocationRecord => Boolean(invocation))
          .slice(0, MAX_RECENT_INVOCATIONS_PER_CLIENT)
      : []
  }
}

function parseInvocationKindStats(kind: InvocationCapabilityKind, value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      kind,
      totalCount: 0,
      successCount: 0,
      errorCount: 0,
      totalDurationMs: 0
    }
  }

  const record = value as Record<string, unknown>

  return {
    kind,
    totalCount: readNumber(record, 'totalCount') ?? 0,
    successCount: readNumber(record, 'successCount') ?? 0,
    errorCount: readNumber(record, 'errorCount') ?? 0,
    totalDurationMs: readNumber(record, 'totalDurationMs') ?? 0,
    ...(readNumber(record, 'minDurationMs') !== undefined
      ? { minDurationMs: readNumber(record, 'minDurationMs') }
      : {}),
    ...(readNumber(record, 'maxDurationMs') !== undefined
      ? { maxDurationMs: readNumber(record, 'maxDurationMs') }
      : {})
  }
}

function parseInvocationRecord(value: unknown): InvocationRecord | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  const record = value as Record<string, unknown>
  const requestId = readString(record, 'requestId')
  const target = readString(record, 'target')
  const durationMs = readNumber(record, 'durationMs')
  const startedAt = readString(record, 'startedAt')
  const finishedAt = readString(record, 'finishedAt')

  if (
    !requestId ||
    !isInvocationCapabilityKind(record.kind) ||
    !target ||
    !isInvocationResultStatus(record.status) ||
    durationMs === undefined ||
    !startedAt ||
    !finishedAt
  ) {
    return undefined
  }

  return {
    requestId,
    kind: record.kind,
    target,
    status: record.status,
    durationMs,
    startedAt,
    finishedAt,
    ...(readString(record, 'errorMessage') ? { errorMessage: readString(record, 'errorMessage') } : {})
  }
}

function isInvocationCapabilityKind(value: unknown): value is InvocationCapabilityKind {
  return value === 'tool' || value === 'prompt' || value === 'skill' || value === 'resource'
}

function isInvocationResultStatus(value: unknown): value is InvocationResultStatus {
  return value === 'success' || value === 'error'
}
