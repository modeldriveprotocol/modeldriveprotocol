import { describe, expect, it, vi } from 'vitest'

import {
  WebSocketClientTransport,
  type WebSocketClassLike,
  type WebSocketCloseEventLike,
  type WebSocketEventLike,
  type WebSocketLike,
  type WebSocketMessageEventLike
} from '../src/ws-client.js'

class FakeWebSocket implements WebSocketLike {
  readyState = 0
  private readonly listeners = new Map<
    'open' | 'message' | 'error' | 'close',
    Array<(
      event: WebSocketEventLike | WebSocketMessageEventLike | WebSocketCloseEventLike
    ) => void>
  >()

  addEventListener(
    type: 'open' | 'message' | 'error' | 'close',
    listener: (
      event: WebSocketEventLike | WebSocketMessageEventLike | WebSocketCloseEventLike
    ) => void
  ): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }

  close(): void {
    this.readyState = 3
    this.emit('close')
  }

  send(): void {}

  emit(
    type: 'open' | 'message' | 'error' | 'close',
    event: WebSocketEventLike | WebSocketMessageEventLike | WebSocketCloseEventLike = {}
  ): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event)
    }
  }
}

describe('WebSocketClientTransport', () => {
  it('supports injecting a websocket class through transport options', async () => {
    const sockets: FakeWebSocket[] = []

    class FakeWebSocketClass extends FakeWebSocket {
      constructor(url: string) {
        super()
        void url
        sockets.push(this)
      }
    }

    const transport = new WebSocketClientTransport('ws://127.0.0.1:47372', {
      webSocketClass: FakeWebSocketClass as WebSocketClassLike
    })

    const connectPromise = transport.connect()

    expect(sockets).toHaveLength(1)

    sockets[0]?.emit('open')
    await connectPromise
  })

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
    sockets[0]?.emit('open')
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

    sockets[1].emit('open')
    await secondConnect

    firstSocket.emit('close')

    expect(onClose).not.toHaveBeenCalled()
  })

  it('supports injecting a binary websocket message decoder', async () => {
    const socket = new FakeWebSocket()
    const transport = new WebSocketClientTransport('ws://127.0.0.1:47372', {
      webSocketFactory: () => socket,
      binaryMessageDecoder: (data) => Buffer.from(data).toString('utf8')
    })
    const onMessage = vi.fn()

    transport.onMessage(onMessage)

    const connectPromise = transport.connect()
    socket.emit('open')
    await connectPromise

    socket.emit('message', {
      data: Uint8Array.from(Buffer.from('{"type":"ping","timestamp":123}'))
    })

    await vi.waitFor(() => {
      expect(onMessage).toHaveBeenCalledWith({
        type: 'ping',
        timestamp: 123
      })
    })
  })
})
