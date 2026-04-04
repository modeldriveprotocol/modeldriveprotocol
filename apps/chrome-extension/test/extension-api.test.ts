import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getRuntimeStatus, sendRuntimeMessage } from '../src/ui/platform/extension-api.js'

describe('chrome extension ui runtime messaging', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('resolves successful runtime responses', async () => {
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: vi.fn().mockResolvedValue({
          ok: true,
          data: { ready: true }
        })
      }
    })

    await expect(sendRuntimeMessage<{ ready: boolean }>({ type: 'runtime:test' })).resolves.toEqual({
      ready: true
    })
  })

  it('times out runtime status requests when the background does not respond', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: vi.fn(() => new Promise(() => undefined))
      }
    })

    const pending = getRuntimeStatus()
    const expectation = expect(pending).rejects.toThrow(
      'Background runtime did not respond to runtime:getStatus within 3000ms.'
    )
    await vi.advanceTimersByTimeAsync(3000)
    await expectation
  })
})
