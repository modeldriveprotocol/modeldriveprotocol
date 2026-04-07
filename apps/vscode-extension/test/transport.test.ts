import { describe, expect, it, vi } from 'vitest'

import type { ClientTransport } from '@modeldriveprotocol/client/node'
import type { ClientToServerMessage, ServerToClientMessage } from '@modeldriveprotocol/protocol'

import { createDefaultClientTransport, observeClientTransport } from '../src/transport.js'

class FakeTransport implements ClientTransport {
  private messageHandler?: (message: ServerToClientMessage) => void
  private closeHandler?: () => void

  connect = vi.fn(async () => {})
  send = vi.fn((_message: ClientToServerMessage) => {})
  close = vi.fn(async () => {})

  onMessage(handler: (message: ServerToClientMessage) => void): void {
    this.messageHandler = handler
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler
  }

  emitMessage(message: ServerToClientMessage): void {
    this.messageHandler?.(message)
  }

  emitClose(): void {
    this.closeHandler?.()
  }
}

describe('vscode extension transport', () => {
  it('wraps transport close and message handlers', async () => {
    const inner = new FakeTransport()
    const observedClose = vi.fn()
    const closeHandler = vi.fn()
    const messageHandler = vi.fn()
    const transport = observeClientTransport(inner, observedClose)

    transport.onClose(closeHandler)
    transport.onMessage(messageHandler)

    await transport.connect()
    transport.send({
      type: 'ping',
      timestamp: 1
    })

    inner.emitMessage({
      type: 'ping',
      timestamp: 2
    })
    inner.emitClose()

    expect(inner.connect).toHaveBeenCalledOnce()
    expect(inner.send).toHaveBeenCalledWith({
      type: 'ping',
      timestamp: 1
    })
    expect(messageHandler).toHaveBeenCalledWith({
      type: 'ping',
      timestamp: 2
    })
    expect(closeHandler).toHaveBeenCalledOnce()
    expect(observedClose).toHaveBeenCalledOnce()
  })

  it('selects websocket and http loop transports by URL scheme', () => {
    expect(
      createDefaultClientTransport('ws://127.0.0.1:47372').constructor.name
    ).toBe('WebSocketClientTransport')
    expect(
      createDefaultClientTransport('https://127.0.0.1:47372').constructor.name
    ).toBe('HttpLoopClientTransport')
  })

  it('rejects unsupported transport schemes', () => {
    expect(() => createDefaultClientTransport('ftp://127.0.0.1')).toThrow(
      'Unsupported MDP transport protocol'
    )
  })
})
