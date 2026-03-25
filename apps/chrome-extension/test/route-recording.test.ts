import { describe, expect, it, vi } from 'vitest'

import { createRouteClientConfig } from '../src/shared/config.js'
import { runRouteRecording } from '../src/background/runtime/route-sessions.js'

describe('chrome extension route recordings', () => {
  it('executes script-based flows in the page main world with tool args', async () => {
    const sendPageCommand = vi.fn().mockResolvedValue({
      clicked: '[data-testid="checkout"]'
    })

    const runtime = {
      getRouteClient: vi.fn().mockResolvedValue(
        createRouteClientConfig({
          id: 'route-script',
          clientId: 'route-script',
          matchPatterns: ['https://app.example.com/*'],
          recordings: [
            {
              id: 'flow-script',
              path: 'script-flow',
              name: 'Script Flow',
              description: 'Runs custom code',
              mode: 'script',
              createdAt: '2026-03-25T10:00:00.000Z',
              updatedAt: '2026-03-25T10:00:00.000Z',
              capturedFeatures: [],
              steps: [],
              scriptSource: 'return args?.selector;'
            }
          ]
        })
      ),
      resolveAllowedPageTabForRouteClient: vi.fn().mockResolvedValue({
        id: 17
      }),
      sendPageCommand
    } as any

    const result = await runRouteRecording(runtime, 'route-script', 'flow-script', {
      selector: '[data-testid="checkout"]'
    })

    expect(sendPageCommand).toHaveBeenCalledWith(
      17,
      expect.objectContaining({
        id: 'route-script'
      }),
      {
        type: 'runMainWorld',
        action: 'runScript',
        args: {
          source: 'return args?.selector;',
          scriptArgs: {
            selector: '[data-testid="checkout"]'
          }
        }
      }
    )
    expect(result).toMatchObject({
      completed: true,
      recordingId: 'flow-script',
      result: {
        clicked: '[data-testid="checkout"]'
      },
      stepCount: 0,
      tabId: 17
    })
  })
})
