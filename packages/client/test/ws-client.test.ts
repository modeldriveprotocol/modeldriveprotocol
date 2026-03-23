import { describe, expect, it, vi } from 'vitest'

import { WebSocketClientTransport, type WebSocketLike } from '../src/ws-client.js'

class FakeWebSocket implements WebSocketLike {
  readyState = 0
  private readonly listeners = new Map<
    'open' | 'message' | 'error' | 'close',
    Array<(event: Event | MessageEvent | CloseEvent) => void>
  >()

  addEventListener(
    type: 'open' | 'message' | 'error' | 'close',
    listener: (event: Event | MessageEvent | CloseEvent) => void
  ): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }

  close(): void {
    this.readyState = 3
    this.emit('close', {} as CloseEvent)
  }

  send(): void {}

  emit(type: 'open' | 'message' | 'error' | 'close', event?: Event | MessageEvent | CloseEvent): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener((event ?? {}) as Event | MessageEvent | CloseEvent)
    }
  }
}

describe('WebSocketClientTransport', () => {
  it('ignores close events from stale sockets after reconnect', async () => {
    const sockets: FakeWebSocket[] = []
    const transport = new WebSocketClientTransport(
      'ws://127.0.0.1:47372',
      () => {
        const socket = new FakeWebSocket()
        sockets.push(socket)
        return socket
      }
    )
    const onClose = vi.fn()

    transport.onClose(onClose)

    const firstConnect = transport.connect()
    sockets[0]?.emit('open', {} as Event)
    await firstConnect

    const firstSocket = sockets[0]
    const secondSocket = sockets[1]

    if (!firstSocket) {
      throw new Error('Expected first socket to exist')
    }

    firstSocket.readyState = 3

    const secondConnect = transport.connect()
    if (!sockets[1]) {
      throw new Error('Expected second socket to exist')
    }

    sockets[1].emit('open', {} as Event)
    await secondConnect

    firstSocket.emit('close', {} as CloseEvent)

    expect(onClose).not.toHaveBeenCalled()
  })
})
