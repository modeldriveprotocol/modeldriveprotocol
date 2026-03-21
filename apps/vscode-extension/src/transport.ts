import { type ClientTransport, HttpLoopClientTransport, WebSocketClientTransport } from '@modeldriveprotocol/client'
import type { ClientToServerMessage, ServerToClientMessage } from '@modeldriveprotocol/protocol'

export function createObservedClientTransport(
  serverUrl: string,
  onClose: () => void
): ClientTransport {
  return observeClientTransport(createDefaultClientTransport(serverUrl), onClose)
}

export function createDefaultClientTransport(serverUrl: string): ClientTransport {
  const protocol = new URL(serverUrl).protocol

  switch (protocol) {
    case 'ws:':
    case 'wss:':
      return new WebSocketClientTransport(serverUrl)
    case 'http:':
    case 'https:':
      return new HttpLoopClientTransport(serverUrl)
    default:
      throw new Error(`Unsupported MDP transport protocol: ${protocol}`)
  }
}

export function observeClientTransport(
  transport: ClientTransport,
  onClose: () => void
): ClientTransport {
  return new ObservedClientTransport(transport, onClose)
}

class ObservedClientTransport implements ClientTransport {
  private messageHandler?: (message: ServerToClientMessage) => void
  private closeHandler?: () => void

  constructor(
    private readonly inner: ClientTransport,
    private readonly onObservedClose: () => void
  ) {
    this.inner.onMessage((message) => {
      this.messageHandler?.(message)
    })

    this.inner.onClose(() => {
      this.closeHandler?.()
      this.onObservedClose()
    })
  }

  connect(): Promise<void> {
    return this.inner.connect()
  }

  send(message: ClientToServerMessage): void {
    this.inner.send(message)
  }

  close(code?: number, reason?: string): Promise<void> {
    return this.inner.close(code, reason)
  }

  onMessage(handler: (message: ServerToClientMessage) => void): void {
    this.messageHandler = handler
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler
  }
}
