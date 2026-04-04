import { type ClientToServerMessage, type ServerToClientMessage, isMdpMessage } from '@modeldriveprotocol/protocol'

import type {
  AbortControllerFactory,
  AbortControllerLike,
  ClientTransport,
  FetchLike,
  FetchRequestOptions,
  FetchResponseLike,
  TransportCredentialsMode
} from '../types.js'
import {
  globalAbortControllerFactory,
  globalFetch
} from '../runtime/transport-defaults.js'
import { resolveUrl } from '../runtime/url-utils.js'

const DEFAULT_HTTP_LOOP_PATH = '/mdp/http-loop'
const DEFAULT_POLL_WAIT_MS = 25_000
const SESSION_HEADER = 'x-mdp-session-id'

export interface HttpLoopClientTransportOptions {
  endpointPath?: string
  headers?: Record<string, string>
  credentials?: TransportCredentialsMode
  fetch?: FetchLike
  abortControllerFactory?: AbortControllerFactory
  pollWaitMs?: number
}

export class HttpLoopClientTransport implements ClientTransport {
  private sessionId: string | undefined
  private messageHandler: ((message: ServerToClientMessage) => void) | undefined
  private closeHandler: (() => void) | undefined
  private readonly sendQueue: ClientToServerMessage[] = []
  private sending = false
  private flushPromise: Promise<void> | undefined
  private closed = false
  private pollAbortController: AbortControllerLike | undefined

  constructor(
    private readonly serverUrl: string,
    private readonly options: HttpLoopClientTransportOptions = {}
  ) {}

  async connect(): Promise<void> {
    if (this.sessionId && !this.closed) {
      return
    }

    const response = await this.fetch(
      this.endpointUrl('/connect'),
      this.requestInit({
        method: 'POST',
        headers: this.requestHeaders(),
        body: '{}'
      })
    )

    if (!response.ok) {
      throw new Error(`Unable to connect to ${this.serverUrl}`)
    }

    const payload = (await response.json()) as { sessionId?: unknown }

    if (typeof payload.sessionId !== 'string') {
      throw new Error(`Invalid HTTP loop handshake response from ${this.serverUrl}`)
    }

    this.sessionId = payload.sessionId
    this.closed = false
    void this.pollLoop()
  }

  send(message: ClientToServerMessage): void {
    if (!this.sessionId || this.closed) {
      throw new Error('Transport is not connected')
    }

    this.sendQueue.push(message)
    this.flushPromise ??= this.flushQueue().finally(() => {
      this.flushPromise = undefined
    })
  }

  async close(): Promise<void> {
    if (this.closed) {
      return
    }

    await this.flushPromise
    this.closed = true
    this.pollAbortController?.abort()

    const sessionId = this.sessionId
    this.sessionId = undefined
    this.sendQueue.length = 0

    if (!sessionId) {
      this.closeHandler?.()
      return
    }

    try {
      await this.fetch(this.endpointUrl('/disconnect'), {
        ...this.requestInit({
          method: 'POST',
          headers: this.requestHeaders({
            [SESSION_HEADER]: sessionId
          })
        })
      })
    } finally {
      this.closeHandler?.()
    }
  }

  onMessage(handler: (message: ServerToClientMessage) => void): void {
    this.messageHandler = handler
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler
  }

  private async flushQueue(): Promise<void> {
    if (this.sending || this.closed) {
      return
    }

    this.sending = true

    try {
      while (this.sendQueue.length > 0) {
        const sessionId = this.sessionId

        if (!sessionId) {
          throw new Error('Transport is not connected')
        }

        const message = this.sendQueue.shift() as ClientToServerMessage
        const response = await this.fetch(
          this.endpointUrl('/send'),
          this.requestInit({
            method: 'POST',
            headers: this.requestHeaders({
              [SESSION_HEADER]: sessionId
            }),
            body: JSON.stringify({ message })
          })
        )

        if (!response.ok) {
          throw new Error(`Unable to send HTTP loop message to ${this.serverUrl}`)
        }
      }
    } catch (error) {
      await this.failTransport(error)
    } finally {
      this.sending = false
    }
  }

  private async pollLoop(): Promise<void> {
    while (this.sessionId && !this.closed) {
      try {
        const sessionId = this.sessionId
        const waitMs = this.options.pollWaitMs ?? DEFAULT_POLL_WAIT_MS

        if (!sessionId) {
          return
        }

        const pollAbortController = this.createAbortController()
        this.pollAbortController = pollAbortController

        const response = await this.fetch(
          `${this.endpointUrl('/poll')}?sessionId=${encodeURIComponent(sessionId)}&waitMs=${waitMs}`,
          this.requestInit({
            method: 'GET',
            headers: this.requestHeaders(),
            signal: pollAbortController.signal
          })
        )

        if (response.status === 204) {
          continue
        }

        if (!response.ok) {
          throw new Error(`Unable to poll HTTP loop messages from ${this.serverUrl}`)
        }

        const payload = (await response.json()) as { message?: unknown }

        if (payload.message === undefined) {
          continue
        }

        const message = asServerToClientMessage(payload.message)

        if (!message) {
          throw new Error('Invalid HTTP loop message payload')
        }

        this.messageHandler?.(message)
      } catch (error) {
        if (this.closed || this.pollAbortController?.signal.aborted) {
          return
        }

        await this.failTransport(error)
        return
      } finally {
        this.pollAbortController = undefined
      }
    }
  }

  private async failTransport(error: unknown): Promise<void> {
    if (this.closed) {
      return
    }

    void error
    this.closed = true
    this.sessionId = undefined
    this.sendQueue.length = 0
    this.pollAbortController?.abort()
    this.closeHandler?.()
  }

  private endpointUrl(suffix: string): string {
    const path = this.options.endpointPath ?? DEFAULT_HTTP_LOOP_PATH
    return resolveUrl(this.serverUrl, `${path}${suffix}`)
  }

  private requestHeaders(extra: Record<string, string> = {}): Record<string, string> {
    return {
      'content-type': 'application/json',
      ...this.options.headers,
      ...extra
    }
  }

  private requestInit(init: FetchRequestOptions): FetchRequestOptions {
    return {
      ...init,
      ...(this.options.credentials
        ? { credentials: this.options.credentials }
        : {})
    }
  }

  private fetch(input: string, init?: FetchRequestOptions): Promise<FetchResponseLike> {
    const fetchImpl = this.options.fetch ?? globalFetch
    return fetchImpl(input, init)
  }

  private createAbortController(): AbortControllerLike {
    const abortControllerFactory = this.options.abortControllerFactory
      ?? globalAbortControllerFactory
    return abortControllerFactory()
  }
}

function asServerToClientMessage(value: unknown): ServerToClientMessage | undefined {
  if (!isMdpMessage(value)) {
    return undefined
  }

  if (
    value.type === 'callClient' ||
    value.type === 'ping' ||
    value.type === 'pong'
  ) {
    return value
  }

  return undefined
}
