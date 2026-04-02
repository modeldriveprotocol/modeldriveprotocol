import {
  type CallClientMessage,
  type ClientDescriptor,
  type ClientToServerMessage,
  type JsonObject,
  createSerializedError,
  parseMessage
} from '@modeldriveprotocol/protocol'
import WebSocket from 'ws'

import type { InvocationRequest } from './invocation-router.js'
import type { MdpServerRuntime } from './mdp-server.js'

export interface MdpUpstreamProxyOptions {
  runtime: MdpServerRuntime
  upstreamUrl: string
  serverId: string
  clientIdPrefix?: string
}

export class MdpUpstreamProxy {
  private readonly runtime: MdpServerRuntime
  private readonly upstreamUrl: string
  private readonly serverId: string
  private readonly clientIdPrefix: string
  private readonly mirroredClients = new Map<string, MirroredUpstreamClient>()
  private readonly pendingByClientId = new Map<string, Promise<void>>()
  private closed = false

  constructor(options: MdpUpstreamProxyOptions) {
    this.runtime = options.runtime
    this.upstreamUrl = options.upstreamUrl
    this.serverId = options.serverId
    this.clientIdPrefix = options.clientIdPrefix ?? `${sanitizeIdFragment(this.serverId)}.`
  }

  start(): Promise<void> {
    return Promise.resolve()
  }

  syncClient(descriptor: ClientDescriptor): Promise<void> {
    return this.enqueue(descriptor.id, async () => {
      if (this.closed) {
        return
      }
      await this.disconnectMirroredClient(descriptor.id)

      const proxyClient = new MirroredUpstreamClient({
        runtime: this.runtime,
        upstreamUrl: this.upstreamUrl,
        localClientId: descriptor.id,
        mirroredDescriptor: {
          ...descriptor,
          id: this.getMirroredClientId(descriptor.id),
          metadata: withProxyMetadata(
            descriptor.metadata,
            this.serverId,
            descriptor.id
          )
        }
      })

      this.mirroredClients.set(descriptor.id, proxyClient)
      await proxyClient.connect()
    })
  }

  removeClient(clientId: string): Promise<void> {
    return this.enqueue(clientId, async () => {
      await this.disconnectMirroredClient(clientId)
    })
  }

  async close(): Promise<void> {
    this.closed = true

    await Promise.allSettled([
      [...this.mirroredClients.keys()].map((clientId) => this.removeClient(clientId))
    ].flat())
  }

  getMirroredClientId(clientId: string): string {
    return `${this.clientIdPrefix}${clientId}`
  }

  private async disconnectMirroredClient(clientId: string): Promise<void> {
    const proxyClient = this.mirroredClients.get(clientId)

    if (!proxyClient) {
      return
    }

    this.mirroredClients.delete(clientId)

    try {
      await proxyClient.disconnect()
    } catch {
      // Ignore close races while replacing or shutting down mirrored clients.
    }
  }

  private enqueue(clientId: string, task: () => Promise<void>): Promise<void> {
    const previous = this.pendingByClientId.get(clientId) ?? Promise.resolve()
    const next = previous
      .catch(() => {})
      .then(task)
      .finally(() => {
        if (this.pendingByClientId.get(clientId) === next) {
          this.pendingByClientId.delete(clientId)
        }
      })

    this.pendingByClientId.set(clientId, next)
    return next
  }

}

interface MirroredUpstreamClientOptions {
  runtime: MdpServerRuntime
  upstreamUrl: string
  localClientId: string
  mirroredDescriptor: ClientDescriptor
}

class MirroredUpstreamClient {
  private readonly runtime: MdpServerRuntime
  private readonly upstreamUrl: string
  private readonly localClientId: string
  private readonly mirroredDescriptor: ClientDescriptor
  private socket: WebSocket | undefined

  constructor(options: MirroredUpstreamClientOptions) {
    this.runtime = options.runtime
    this.upstreamUrl = options.upstreamUrl
    this.localClientId = options.localClientId
    this.mirroredDescriptor = options.mirroredDescriptor
  }

  async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return
    }

    const socket = new WebSocket(this.upstreamUrl)
    this.socket = socket

    await new Promise<void>((resolve, reject) => {
      let settled = false

      const resolveOnce = () => {
        if (settled) {
          return
        }

        settled = true
        resolve()
      }

      const rejectOnce = (error: Error) => {
        if (settled) {
          return
        }

        settled = true
        reject(error)
      }

      socket.once('open', () => {
        try {
          this.send({
            type: 'registerClient',
            client: this.mirroredDescriptor
          }, socket)
          resolveOnce()
        } catch (error) {
          rejectOnce(
            error instanceof Error ? error : new Error(String(error))
          )
        }
      })

      socket.on('error', (error) => {
        const normalized = error instanceof Error
          ? error
          : new Error(`Unable to connect upstream proxy to ${this.upstreamUrl}`)

        if (!settled) {
          rejectOnce(new Error(`Unable to connect upstream proxy to ${this.upstreamUrl}`))
          return
        }

        this.socket = undefined
      })

      socket.on('close', () => {
        if (!settled) {
          rejectOnce(new Error(`Unable to connect upstream proxy to ${this.upstreamUrl}`))
          return
        }

        this.socket = undefined
      })

      socket.on('message', (payload, isBinary) => {
        if (isBinary) {
          socket.close(1003, 'Binary frames are not supported')
          return
        }

        void this.handleMessage(payload.toString())
      })
    })
  }

  async disconnect(): Promise<void> {
    if (!this.socket) {
      return
    }

    const socket = this.socket
    this.socket = undefined

    if (socket.readyState === WebSocket.OPEN) {
      this.send({
        type: 'unregisterClient',
        clientId: this.mirroredDescriptor.id
      }, socket)
    }

    await new Promise<void>((resolve) => {
      if (
        socket.readyState === WebSocket.CLOSED ||
        socket.readyState === WebSocket.CLOSING
      ) {
        resolve()
        return
      }

      socket.once('close', () => {
        resolve()
      })
      socket.close()
    })
  }

  private async handleMessage(payload: string): Promise<void> {
    const message = parseMessage(payload)

    if (message.type === 'ping') {
      this.send({
        type: 'pong',
        timestamp: message.timestamp
      })
      return
    }

    if (message.type !== 'callClient') {
      return
    }

    await this.forwardInvocation(message)
  }

  private async forwardInvocation(message: CallClientMessage): Promise<void> {
    try {
      const result = await this.runtime.invoke({
        clientId: this.localClientId,
        method: message.method,
        path: message.path,
        ...(message.query ? { query: message.query } : {}),
        ...(message.body !== undefined ? { body: message.body } : {}),
        ...(message.headers ? { headers: message.headers } : {}),
        ...(message.auth ? { auth: message.auth } : {})
      } satisfies InvocationRequest)

      this.send({
        type: 'callClientResult',
        requestId: message.requestId,
        ok: result.ok,
        ...(result.ok
          ? { data: result.data }
          : {
              error: result.error ?? createSerializedError(
                'handler_error',
                `Upstream invocation failed for client "${this.localClientId}"`
              )
            })
      })
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error))

      this.send({
        type: 'callClientResult',
        requestId: message.requestId,
        ok: false,
        error: createSerializedError('handler_error', normalized.message)
      })
    }
  }

  private send(
    message: ClientToServerMessage,
    socket: WebSocket = this.requireSocket()
  ): void {
    socket.send(JSON.stringify(message))
  }

  private requireSocket(): WebSocket {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Upstream proxy socket is not connected')
    }

    return this.socket
  }

}

function withProxyMetadata(
  metadata: JsonObject | undefined,
  serverId: string,
  clientId: string
): JsonObject {
  return {
    ...(metadata ?? {}),
    mdpProxy: {
      serverId,
      clientId
    }
  }
}

function sanitizeIdFragment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-')
}
