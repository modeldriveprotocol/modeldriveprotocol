import { type ClientToServerMessage, type ServerToClientMessage, parseMessage } from '@modeldriveprotocol/protocol'

import type { ClientTransport } from '../types.js'

export interface WebSocketLike {
  readonly readyState: number
  addEventListener(
    type: 'open' | 'message' | 'error' | 'close',
    listener: (event: Event | MessageEvent | CloseEvent) => void
  ): void
  close(code?: number, reason?: string): void
  send(data: string): void
}

export type WebSocketFactory = (url: string) => WebSocketLike

export class WebSocketClientTransport implements ClientTransport {
  private socket?: WebSocketLike
  private messageHandler?: (message: ServerToClientMessage) => void
  private closeHandler?: () => void

  constructor(
    private readonly serverUrl: string,
    private readonly webSocketFactory: WebSocketFactory = defaultWebSocketFactory
  ) {}

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

        void readMessagePayload(event as MessageEvent).then((payload) => {
          if (!this.isCurrentSocket(socket) || !this.messageHandler) {
            return
          }

          const message = asServerToClientMessage(parseMessage(payload))

          if (!message) {
            return
          }

          this.messageHandler(message)
        })
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

function defaultWebSocketFactory(url: string): WebSocketLike {
  const WebSocketConstructor = globalThis.WebSocket

  if (!WebSocketConstructor) {
    throw new Error('No WebSocket implementation is available in this runtime')
  }

  return new WebSocketConstructor(url) as WebSocketLike
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

async function readMessagePayload(event: MessageEvent): Promise<string> {
  if (typeof event.data === 'string') {
    return event.data
  }

  if (event.data instanceof ArrayBuffer) {
    return new TextDecoder().decode(event.data)
  }

  if (event.data instanceof Blob) {
    return event.data.text()
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
