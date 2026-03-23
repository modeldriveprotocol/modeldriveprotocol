import type {
  MdpClientReconnectEvent,
  MdpClientReconnectOptions
} from '../types.js'

export interface ResolvedReconnectOptions extends MdpClientReconnectOptions {
  enabled: true
  initialDelayMs: number
  maxDelayMs: number
  multiplier: number
}

interface MdpClientReconnectControllerOptions {
  serverUrl: string
  reconnect: boolean | MdpClientReconnectOptions | undefined
  reconnectTransport: () => Promise<void>
}

interface PendingReconnect {
  promise: Promise<void>
  resolve: () => void
  reject: (error: Error) => void
}

const DEFAULT_RECONNECT_INITIAL_DELAY_MS = 1_000
const DEFAULT_RECONNECT_MAX_DELAY_MS = 30_000
const DEFAULT_RECONNECT_MULTIPLIER = 2

export class MdpClientReconnectController {
  private readonly serverUrl: string
  private readonly reconnect: ResolvedReconnectOptions | undefined
  private readonly reconnectTransport: () => Promise<void>
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined
  private reconnecting = false
  private disconnectRequested = false
  private pendingReconnect: PendingReconnect | undefined

  constructor(options: MdpClientReconnectControllerOptions) {
    this.serverUrl = options.serverUrl
    this.reconnect = resolveReconnectOptions(options.reconnect)
    this.reconnectTransport = options.reconnectTransport
  }

  beginConnect(): void {
    this.disconnectRequested = false
    this.clearReconnectTimer()
  }

  async connect(): Promise<void> {
    try {
      await this.reconnectTransport()
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error))

      if (!this.reconnect?.enabled || this.disconnectRequested) {
        throw normalized
      }

      await this.ensureReconnectScheduled(normalized)
    }
  }

  beginDisconnect(): void {
    this.disconnectRequested = true
    this.reconnecting = false
    this.clearReconnectTimer()
    this.rejectPendingReconnect(new Error(`Reconnect to ${this.serverUrl} was cancelled`))
  }

  isDisconnectRequested(): boolean {
    return this.disconnectRequested
  }

  handleUnexpectedClose(error?: Error): void {
    if (!this.reconnect?.enabled || this.disconnectRequested) {
      return
    }

    this.emitReconnectEvent({
      type: 'disconnected'
    })
    void this.ensureReconnectScheduled(
      error ?? new Error(`Connection to ${this.serverUrl} was closed`)
    ).catch(() => {})
  }

  private ensureReconnectScheduled(error: Error): Promise<void> {
    if (!this.pendingReconnect) {
      let resolvePending!: () => void
      let rejectPending!: (error: Error) => void
      const promise = new Promise<void>((resolve, reject) => {
        resolvePending = resolve
        rejectPending = reject
      })

      this.pendingReconnect = {
        promise,
        resolve: resolvePending,
        reject: rejectPending
      }
    }

    this.scheduleReconnect(error)
    return this.pendingReconnect.promise
  }

  private scheduleReconnect(error?: Error): void {
    if (
      !this.reconnect?.enabled ||
      this.disconnectRequested ||
      this.reconnecting ||
      this.reconnectTimer
    ) {
      return
    }

    const attempt = this.reconnectAttempt + 1

    if (
      this.reconnect.maxAttempts !== undefined &&
      attempt > this.reconnect.maxAttempts
    ) {
      const finalError = error ?? new Error(`Unable to reconnect to ${this.serverUrl}`)
      this.emitReconnectEvent({
        type: 'reconnectStopped',
        attempt: this.reconnectAttempt,
        error: finalError
      })
      this.rejectPendingReconnect(finalError)
      return
    }

    const delayMs = calculateReconnectDelay(attempt, this.reconnect)
    this.emitReconnectEvent({
      type: 'reconnectScheduled',
      attempt,
      delayMs,
      ...(error ? { error } : {})
    })
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined
      void this.runReconnectAttempt(attempt)
    }, delayMs)
  }

  private async runReconnectAttempt(attempt: number): Promise<void> {
    if (!this.reconnect?.enabled || this.disconnectRequested || this.reconnecting) {
      return
    }

    this.reconnecting = true
    this.reconnectAttempt = attempt
    this.emitReconnectEvent({
      type: 'reconnectAttempt',
      attempt
    })

    try {
      await this.reconnectTransport()

      if (this.disconnectRequested) {
        return
      }

      this.reconnectAttempt = 0
      this.emitReconnectEvent({
        type: 'reconnected',
        attempt
      })
      this.resolvePendingReconnect()
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error))
      this.reconnecting = false
      this.scheduleReconnect(normalized)
      return
    } finally {
      this.reconnecting = false
    }
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) {
      return
    }

    clearTimeout(this.reconnectTimer)
    this.reconnectTimer = undefined
  }

  private resolvePendingReconnect(): void {
    if (!this.pendingReconnect) {
      return
    }

    const pending = this.pendingReconnect
    this.pendingReconnect = undefined
    pending.resolve()
  }

  private rejectPendingReconnect(error: Error): void {
    if (!this.pendingReconnect) {
      return
    }

    const pending = this.pendingReconnect
    this.pendingReconnect = undefined
    pending.reject(error)
  }

  private emitReconnectEvent(event: MdpClientReconnectEvent): void {
    try {
      this.reconnect?.onEvent?.(event)
    } catch {
      return
    }
  }
}

function resolveReconnectOptions(
  reconnect: boolean | MdpClientReconnectOptions | undefined
): ResolvedReconnectOptions | undefined {
  if (reconnect === undefined || reconnect === false) {
    return undefined
  }

  const options = reconnect === true ? {} : reconnect

  if (options.enabled === false) {
    return undefined
  }

  const initialDelayMs = normalizePositiveInteger(
    options.initialDelayMs,
    DEFAULT_RECONNECT_INITIAL_DELAY_MS
  )
  const maxDelayMs = Math.max(
    initialDelayMs,
    normalizePositiveInteger(options.maxDelayMs, DEFAULT_RECONNECT_MAX_DELAY_MS)
  )
  const multiplier = Math.max(1, options.multiplier ?? DEFAULT_RECONNECT_MULTIPLIER)

  return {
    ...options,
    enabled: true,
    initialDelayMs,
    maxDelayMs,
    multiplier,
    ...(options.maxAttempts !== undefined
      ? { maxAttempts: Math.max(0, Math.trunc(options.maxAttempts)) }
      : {})
  }
}

function calculateReconnectDelay(
  attempt: number,
  options: ResolvedReconnectOptions
): number {
  const exponent = Math.max(0, attempt - 1)
  return Math.min(
    options.maxDelayMs,
    Math.round(options.initialDelayMs * options.multiplier ** exponent)
  )
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return fallback
  }

  return Math.max(1, Math.trunc(value))
}
