import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildInvocationOverview,
  createInvocationTelemetryMiddleware,
  recordInvocationTelemetry,
  toClientInvocationStats
} from '../src/background/runtime/telemetry.js'

describe('chrome extension invocation telemetry', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('records invocation duration and status through the client middleware hook', async () => {
    vi.useFakeTimers()
    const telemetry = new Map()
    const middleware = createInvocationTelemetryMiddleware(telemetry, 'route:alpha')

    vi.setSystemTime(new Date('2026-03-25T10:00:00.000Z'))
    await middleware(
      {
        requestId: 'req-success',
        clientId: 'route-client-alpha',
        type: 'endpoint',
        method: 'POST',
        path: '/compat/tools/search-dom/6f3e8f10',
        legacy: {
          kind: 'tool',
          name: 'searchDom'
        },
        params: {},
        queries: {},
        body: {
          query: 'checkout'
        },
        headers: {}
      },
      async () => {
        vi.setSystemTime(new Date('2026-03-25T10:00:00.120Z'))
        return { matches: 3 }
      }
    )

    vi.setSystemTime(new Date('2026-03-25T10:00:01.000Z'))
    await expect(
      middleware(
        {
          requestId: 'req-error',
          clientId: 'route-client-alpha',
          type: 'endpoint',
          method: 'GET',
          path: '/compat/resources/webpage/selection/29c3c4cf',
          legacy: {
            kind: 'resource',
            uri: 'webpage://selection'
          },
          params: {},
          queries: {},
          headers: {}
        },
        async () => {
          vi.setSystemTime(new Date('2026-03-25T10:00:01.240Z'))
          throw new Error('selector unavailable')
        }
      )
    ).rejects.toThrow('selector unavailable')

    const stats = toClientInvocationStats(telemetry.get('route:alpha'))

    expect(stats.totalCount).toBe(2)
    expect(stats.successCount).toBe(1)
    expect(stats.errorCount).toBe(1)
    expect(stats.averageDurationMs).toBe(180)
    expect(stats.maxDurationMs).toBe(240)
    expect(stats.lastStatus).toBe('error')
    expect(stats.lastTarget).toBe('webpage://selection')
    expect(stats.recentInvocations[0]).toMatchObject({
      requestId: 'req-error',
      kind: 'resource',
      target: 'webpage://selection',
      status: 'error',
      durationMs: 240,
      errorMessage: 'selector unavailable'
    })
    expect(stats.byKind.find((item) => item.kind === 'tool')).toMatchObject({
      totalCount: 1,
      successCount: 1
    })
    expect(stats.byKind.find((item) => item.kind === 'resource')).toMatchObject({
      totalCount: 1,
      errorCount: 1
    })
  })

  it('builds an overview summary and recent activity across clients', () => {
    const telemetry = new Map()

    recordInvocationTelemetry(telemetry, 'route:alpha', {
      requestId: 'req-1',
      kind: 'tool',
      target: 'searchDom',
      status: 'success',
      startedAt: '2026-03-25T10:00:00.000Z',
      finishedAtMs: Date.parse('2026-03-25T10:00:00.080Z')
    })
    recordInvocationTelemetry(telemetry, 'route:alpha', {
      requestId: 'req-2',
      kind: 'prompt',
      target: 'summarizeSelection',
      status: 'error',
      startedAt: '2026-03-25T10:00:02.000Z',
      finishedAtMs: Date.parse('2026-03-25T10:00:02.140Z'),
      errorMessage: 'prompt failed'
    })
    recordInvocationTelemetry(telemetry, 'background', {
      requestId: 'req-3',
      kind: 'resource',
      target: 'chrome-extension://tabs',
      status: 'success',
      startedAt: '2026-03-25T10:00:03.000Z',
      finishedAtMs: Date.parse('2026-03-25T10:00:03.030Z')
    })

    const overview = buildInvocationOverview([
      {
        clientKey: 'route:alpha',
        clientName: 'Alpha Route',
        invocationStats: toClientInvocationStats(telemetry.get('route:alpha'))
      },
      {
        clientKey: 'background',
        clientName: 'Background Client',
        invocationStats: toClientInvocationStats(telemetry.get('background'))
      }
    ])

    expect(overview.totalCount).toBe(3)
    expect(overview.successCount).toBe(2)
    expect(overview.errorCount).toBe(1)
    expect(overview.activeClientCount).toBe(2)
    expect(overview.clients[0]).toMatchObject({
      clientKey: 'route:alpha',
      totalCount: 2,
      errorCount: 1
    })
    expect(overview.recentInvocations[0]).toMatchObject({
      clientKey: 'background',
      clientName: 'Background Client',
      requestId: 'req-3'
    })
  })
})
