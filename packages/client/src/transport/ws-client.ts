import { type ClientToServerMessage, type ServerToClientMessage, parseMessage } from '@modeldriveprotocol/protocol'

import type { ClientTransport } from '../types.js'
import {
  globalBinaryMessageDecoder,
  globalWebSocketFactory
} from '../runtime/transport-defaults.js'

export interface WebSocketEventLike {
}

export interface WebSocketMessageEventLike extends WebSocketEventLike {
  readonly data: unknown
}

export interface WebSocketCloseEventLike extends WebSocketEventLike {
}

export type BinaryMessageDecoder = (data: Uint8Array) => string

export interface WebSocketLike {
  readonly readyState: number
  addEventListener(
    type: 'open' | 'message' | 'error' | 'close',
    listener: (
      event:
      | WebSocketEventLike
      | WebSocketMessageEventLike
      | WebSocketCloseEventLike
    ) => void
  ): void
  close(code?: number, reason?: string): void
  send(data: string): void
}

export interface WebSocketClassLike {
  new (url: string): WebSocketLike
}

export type WebSocketFactory = (url: string) => WebSocketLike

export interface WebSocketClientTransportOptions {
  webSocketClass?: WebSocketClassLike
  webSocketFactory?: WebSocketFactory
  binaryMessageDecoder?: BinaryMessageDecoder
}

export class WebSocketClientTransport implements ClientTransport {
  private socket: WebSocketLike | undefined
  private messageHandler?: (message: ServerToClientMessage) => void
  private closeHandler?: () => void
  private readonly webSocketFactory: WebSocketFactory
  private readonly binaryMessageDecoder: BinaryMessageDecoder

  constructor(
    private readonly serverUrl: string,
    options: WebSocketFactory | WebSocketClientTransportOptions = globalWebSocketFactory
  ) {
    this.webSocketFactory = resolveWebSocketFactory(options)
    this.binaryMessageDecoder = resolveBinaryMessageDecoder(options)
  }

  async connect(): Promise<void> {
    if (this.socket && this.socket.readyState === 1) {
      return
    }

    const socket = this.webSocketFactory(this.serverUrl)
    this.socket = socket

    await new Promise<void>((resolve, reject) => {
      socket.addEventListener('open', () => {
        if (!this.isCurrentSocket(socket)) {
          return
        }

        resolve()
      })

      socket.addEventListener('error', () => {
        if (!this.isCurrentSocket(socket)) {
          return
        }

        reject(new Error(`Unable to connect to ${this.serverUrl}`))
      })

      socket.addEventListener('message', (event) => {
        if (!this.isCurrentSocket(socket)) {
          return
        }

        void (async () => {
          try {
            const payload = await readMessagePayload(
              event as WebSocketMessageEventLike,
              this.binaryMessageDecoder
            )

            if (!this.isCurrentSocket(socket) || !this.messageHandler) {
              return
            }

            const message = asServerToClientMessage(parseMessage(payload))

            if (!message) {
              return
            }

            this.messageHandler(message)
          } catch {
            return
          }
        })()
      })

      socket.addEventListener('close', () => {
        if (!this.isCurrentSocket(socket)) {
          return
        }

        this.socket = undefined
        this.closeHandler?.()
      })
    })
  }

  send(message: ClientToServerMessage): void {
    if (!this.socket || this.socket.readyState !== 1) {
      throw new Error('Transport is not connected')
    }

    this.socket.send(JSON.stringify(message))
  }

  async close(code?: number, reason?: string): Promise<void> {
    this.socket?.close(code, reason)
  }

  onMessage(handler: (message: ServerToClientMessage) => void): void {
    this.messageHandler = handler
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler
  }

  private isCurrentSocket(socket: WebSocketLike): boolean {
    return this.socket === socket
  }
}

function resolveWebSocketFactory(
  options: WebSocketFactory | WebSocketClientTransportOptions
): WebSocketFactory {
  if (typeof options === 'function') {
    return options
  }

  if (options.webSocketFactory) {
    return options.webSocketFactory
  }

  if (options.webSocketClass) {
    const { webSocketClass } = options
    return (url) => new webSocketClass(url)
  }

  return globalWebSocketFactory
}

function resolveBinaryMessageDecoder(
  options: WebSocketFactory | WebSocketClientTransportOptions
): BinaryMessageDecoder {
  if (typeof options === 'function') {
    return globalBinaryMessageDecoder
  }

  return options.binaryMessageDecoder ?? globalBinaryMessageDecoder
}

function asServerToClientMessage(
  message: ReturnType<typeof parseMessage>
): ServerToClientMessage | undefined {
  if (
    message.type === 'callClient' ||
    message.type === 'ping' ||
    message.type === 'pong'
  ) {
    return message
  }

  return undefined
}

async function readMessagePayload(
  event: WebSocketMessageEventLike,
  binaryMessageDecoder: BinaryMessageDecoder
): Promise<string> {
  if (typeof event.data === 'string') {
    return event.data
  }

  const binaryData = asBinaryMessageData(event.data)

  if (binaryData) {
    return binaryMessageDecoder(binaryData)
  }

  if (
    typeof event.data === 'object' &&
    event.data !== null &&
    'text' in event.data &&
    typeof event.data.text === 'function'
  ) {
    const text = await event.data.text()

    if (typeof text === 'string') {
      return text
    }
  }

  if (
    typeof event.data === 'object' &&
    event.data !== null &&
    'toString' in event.data
  ) {
    return String(event.data)
  }

  throw new Error('Unsupported WebSocket payload')
}

function asBinaryMessageData(data: unknown): Uint8Array | undefined {
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data)
  }

  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  }

  return undefined
}
