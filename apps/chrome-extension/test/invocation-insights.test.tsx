// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { InvocationOverviewStats } from '../src/background/shared.js'
import { WorkspaceInvocationOverview } from '../src/ui/apps/options/sections/invocation-insights.js'
import { I18nProvider } from '../src/ui/i18n/provider.js'

describe('invocation insights', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)

    vi.stubGlobal('chrome', {
      i18n: {
        getUILanguage: () => 'en'
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined)
        },
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn()
        }
      }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    container.remove()
  })

  it('renders recent activity without invalid DOM nesting and supports filtering', async () => {
    const root = createRoot(container)
    const onClearHistory = vi.fn()
    const onOpenClientActivity = vi.fn()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const overview: InvocationOverviewStats = {
      totalCount: 2,
      successCount: 1,
      errorCount: 1,
      totalDurationMs: 11,
      averageDurationMs: 5.5,
      maxDurationMs: 10,
      lastInvokedAt: '2026-04-05T20:20:03.235Z',
      activeClientCount: 1,
      clients: [
        {
          clientKey: 'route:route-client-review',
          clientName: 'Route Review Client',
          totalCount: 2,
          successCount: 1,
          errorCount: 1,
          totalDurationMs: 11,
          averageDurationMs: 5.5,
          maxDurationMs: 10,
          lastInvokedAt: '2026-04-05T20:20:03.235Z'
        }
      ],
      recentInvocations: [
        {
          requestId: 'success-call',
          kind: 'endpoint',
          target: '/route/summary',
          status: 'success',
          durationMs: 1,
          startedAt: '2026-04-05T20:20:03.234Z',
          finishedAt: '2026-04-05T20:20:03.235Z',
          clientKey: 'route:route-client-review',
          clientName: 'Route Review Client'
        },
        {
          requestId: 'error-call',
          kind: 'endpoint',
          target: '/page/snapshot',
          status: 'error',
          durationMs: 10,
          startedAt: '2026-04-05T20:19:59.234Z',
          finishedAt: '2026-04-05T20:20:02.234Z',
          errorMessage: 'No matching tab',
          clientKey: 'route:route-client-review',
          clientName: 'Route Review Client'
        }
      ]
    }

    await act(async () => {
      root.render(
        <I18nProvider>
          <WorkspaceInvocationOverview
            onClearHistory={onClearHistory}
            onOpenClientActivity={onOpenClientActivity}
            overview={overview}
          />
        </I18nProvider>
      )
    })

    expect(container.textContent).toContain('Route Review Client')
    expect(container.textContent).toContain('/route/summary')
    expect(container.textContent).toContain('/page/snapshot')
    expect(
      errorSpy.mock.calls.some((call) =>
        String(call[0]).includes('cannot be a descendant of <p>')
      )
    ).toBe(false)

    const openActivityButton = Array.from(
      container.querySelectorAll('button')
    ).find((button) => button.textContent?.includes('Open activity'))

    expect(openActivityButton).not.toBeUndefined()

    await act(async () => {
      openActivityButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      )
    })

    expect(onOpenClientActivity).toHaveBeenCalledWith(
      'route:route-client-review'
    )

    const failuresOnlyButton = Array.from(
      container.querySelectorAll('button')
    ).find((button) => button.textContent?.includes('Only failures'))

    expect(failuresOnlyButton).not.toBeUndefined()

    await act(async () => {
      failuresOnlyButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      )
    })

    expect(container.textContent).toContain('/page/snapshot')
    expect(container.textContent).not.toContain('/route/summary')

    const clearHistoryButton = Array.from(
      container.querySelectorAll('button')
    ).find((button) => button.textContent?.includes('Clear history'))

    expect(clearHistoryButton).not.toBeUndefined()

    await act(async () => {
      clearHistoryButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      )
    })

    expect(onClearHistory).toHaveBeenCalledTimes(1)

    errorSpy.mockRestore()
  })
})
