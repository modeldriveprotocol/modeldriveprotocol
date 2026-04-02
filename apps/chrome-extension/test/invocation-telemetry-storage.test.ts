import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_BACKGROUND_CLIENT } from '../src/shared/config.js'
import { createClientKey } from '../src/background/shared.js'
import {
  clearInvocationTelemetry,
  ensureInvocationTelemetryLoaded,
  scheduleInvocationTelemetryPersist
} from '../src/background/runtime/telemetry-storage.js'

describe('chrome extension invocation telemetry storage', () => {
  const get = vi.fn()
  const set = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    get.mockReset()
    set.mockReset()
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get,
          set
        }
      }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('hydrates persisted telemetry into runtime memory once', async () => {
    get.mockResolvedValue({
      invocationTelemetry: {
        'route:alpha': {
          totalCount: 2,
          successCount: 1,
          errorCount: 1,
          totalDurationMs: 360,
          maxDurationMs: 240,
          byKind: {
            endpoint: {
              kind: 'endpoint',
              totalCount: 1,
              successCount: 1,
              errorCount: 0,
              totalDurationMs: 120
            },
            prompt: {
              kind: 'prompt',
              totalCount: 0,
              successCount: 0,
              errorCount: 0,
              totalDurationMs: 0
            },
            skill: {
              kind: 'skill',
              totalCount: 0,
              successCount: 0,
              errorCount: 0,
              totalDurationMs: 0
            }
          },
          recentInvocations: [
            {
              requestId: 'req-2',
              kind: 'prompt',
              target: '/summaries/prompt.md',
              status: 'error',
              durationMs: 240,
              startedAt: '2026-03-25T10:00:01.000Z',
              finishedAt: '2026-03-25T10:00:01.240Z',
              errorMessage: 'selector unavailable'
            }
          ]
        }
      }
    })

    const runtime = {
      telemetryLoaded: false,
      clientTelemetry: new Map(),
      telemetryPersistTimer: undefined
    } as any

    await ensureInvocationTelemetryLoaded(runtime)
    await ensureInvocationTelemetryLoaded(runtime)

    expect(get).toHaveBeenCalledTimes(1)
    expect(runtime.clientTelemetry.get('route:alpha')).toMatchObject({
      totalCount: 2,
      errorCount: 1
    })
  })

  it('migrates legacy singleton background telemetry keys to the default background client id', async () => {
    get.mockResolvedValue({
      invocationTelemetry: {
        background: {
          totalCount: 1,
          successCount: 1,
          errorCount: 0,
          totalDurationMs: 30,
          byKind: {
            endpoint: {
              kind: 'endpoint',
              totalCount: 1,
              successCount: 1,
              errorCount: 0,
              totalDurationMs: 30
            },
            prompt: { kind: 'prompt', totalCount: 0, successCount: 0, errorCount: 0, totalDurationMs: 0 },
            skill: { kind: 'skill', totalCount: 0, successCount: 0, errorCount: 0, totalDurationMs: 0 }
          },
          recentInvocations: []
        }
      }
    })

    const runtime = {
      telemetryLoaded: false,
      clientTelemetry: new Map(),
      telemetryPersistTimer: undefined
    } as any

    await ensureInvocationTelemetryLoaded(runtime)

    expect(runtime.clientTelemetry.has(createClientKey('background', DEFAULT_BACKGROUND_CLIENT.id))).toBe(true)
    expect(runtime.clientTelemetry.has('background')).toBe(false)
  })

  it('maps legacy tool and resource telemetry into endpoint telemetry on load', async () => {
    get.mockResolvedValue({
      invocationTelemetry: {
        'route:alpha': {
          totalCount: 3,
          successCount: 2,
          errorCount: 1,
          totalDurationMs: 390,
          byKind: {
            tool: {
              kind: 'tool',
              totalCount: 1,
              successCount: 1,
              errorCount: 0,
              totalDurationMs: 120,
              minDurationMs: 120,
              maxDurationMs: 120
            },
            prompt: {
              kind: 'prompt',
              totalCount: 0,
              successCount: 0,
              errorCount: 0,
              totalDurationMs: 0
            },
            skill: {
              kind: 'skill',
              totalCount: 0,
              successCount: 0,
              errorCount: 0,
              totalDurationMs: 0
            },
            resource: {
              kind: 'resource',
              totalCount: 2,
              successCount: 1,
              errorCount: 1,
              totalDurationMs: 270,
              minDurationMs: 90,
              maxDurationMs: 180
            }
          },
          recentInvocations: [
            {
              requestId: 'req-tool',
              kind: 'tool',
              target: 'route.getStatus',
              status: 'success',
              durationMs: 120,
              startedAt: '2026-03-25T10:00:00.000Z',
              finishedAt: '2026-03-25T10:00:00.120Z'
            },
            {
              requestId: 'req-resource',
              kind: 'resource',
              target: 'chrome-extension://route-client/alpha/summary',
              status: 'error',
              durationMs: 180,
              startedAt: '2026-03-25T10:00:01.000Z',
              finishedAt: '2026-03-25T10:00:01.180Z',
              errorMessage: 'not available'
            }
          ]
        }
      }
    })

    const runtime = {
      telemetryLoaded: false,
      clientTelemetry: new Map(),
      telemetryPersistTimer: undefined
    } as any

    await ensureInvocationTelemetryLoaded(runtime)

    expect(runtime.clientTelemetry.get('route:alpha')).toMatchObject({
      byKind: {
        endpoint: {
          totalCount: 3,
          successCount: 2,
          errorCount: 1,
          totalDurationMs: 390,
          minDurationMs: 90,
          maxDurationMs: 180
        }
      }
    })
    expect(runtime.clientTelemetry.get('route:alpha')?.recentInvocations).toEqual([
      expect.objectContaining({
        requestId: 'req-tool',
        kind: 'endpoint',
        target: 'route.getStatus'
      }),
      expect.objectContaining({
        requestId: 'req-resource',
        kind: 'endpoint',
        target: 'chrome-extension://route-client/alpha/summary'
      })
    ])
  })

  it('persists telemetry with debounce', async () => {
    const runtime = {
      telemetryLoaded: true,
      clientTelemetry: new Map([
        [
          'background',
          {
            totalCount: 1,
            successCount: 1,
            errorCount: 0,
            totalDurationMs: 30,
            lastInvokedAt: '2026-03-25T10:00:03.030Z',
            lastStatus: 'success',
            lastDurationMs: 30,
            lastTarget: '/extension/resources/tabs',
            byKind: {
              endpoint: {
                kind: 'endpoint',
                totalCount: 1,
                successCount: 1,
                errorCount: 0,
                totalDurationMs: 30
              },
              prompt: {
                kind: 'prompt',
                totalCount: 0,
                successCount: 0,
                errorCount: 0,
                totalDurationMs: 0
              },
              skill: {
                kind: 'skill',
                totalCount: 0,
                successCount: 0,
                errorCount: 0,
                totalDurationMs: 0
              }
            },
            recentInvocations: [
              {
                requestId: 'req-3',
                kind: 'endpoint',
                target: '/extension/resources/tabs',
                status: 'success',
                durationMs: 30,
                startedAt: '2026-03-25T10:00:03.000Z',
                finishedAt: '2026-03-25T10:00:03.030Z'
              }
            ]
          }
        ]
      ]),
      telemetryPersistTimer: undefined
    } as any

    scheduleInvocationTelemetryPersist(runtime)
    scheduleInvocationTelemetryPersist(runtime)

    expect(set).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(500)

    expect(set).toHaveBeenCalledTimes(1)
    expect(set).toHaveBeenCalledWith({
      invocationTelemetry: {
        background: expect.objectContaining({
          totalCount: 1,
          lastTarget: '/extension/resources/tabs'
        })
      }
    })
  })

  it('clears one client or all persisted telemetry immediately', async () => {
    const runtime = {
      telemetryLoaded: true,
      clientTelemetry: new Map([
        [
          'background',
          {
            totalCount: 1,
            successCount: 1,
            errorCount: 0,
            totalDurationMs: 30,
            byKind: {
              endpoint: {
                kind: 'endpoint',
                totalCount: 1,
                successCount: 1,
                errorCount: 0,
                totalDurationMs: 30
              },
              prompt: { kind: 'prompt', totalCount: 0, successCount: 0, errorCount: 0, totalDurationMs: 0 },
              skill: { kind: 'skill', totalCount: 0, successCount: 0, errorCount: 0, totalDurationMs: 0 }
            },
            recentInvocations: []
          }
        ],
        [
          'route:alpha',
          {
            totalCount: 2,
            successCount: 1,
            errorCount: 1,
            totalDurationMs: 360,
            byKind: {
              endpoint: { kind: 'endpoint', totalCount: 1, successCount: 1, errorCount: 0, totalDurationMs: 120 },
              prompt: { kind: 'prompt', totalCount: 1, successCount: 0, errorCount: 1, totalDurationMs: 240 },
              skill: { kind: 'skill', totalCount: 0, successCount: 0, errorCount: 0, totalDurationMs: 0 }
            },
            recentInvocations: []
          }
        ]
      ]),
      telemetryPersistTimer: undefined
    } as any

    await clearInvocationTelemetry(runtime, 'route:alpha')

    expect(runtime.clientTelemetry.has('route:alpha')).toBe(false)
    expect(runtime.clientTelemetry.has('background')).toBe(true)
    expect(set).toHaveBeenLastCalledWith({
      invocationTelemetry: {
        background: expect.objectContaining({
          totalCount: 1
        })
      }
    })

    await clearInvocationTelemetry(runtime)

    expect(runtime.clientTelemetry.size).toBe(0)
    expect(set).toHaveBeenLastCalledWith({
      invocationTelemetry: {}
    })
  })
})
