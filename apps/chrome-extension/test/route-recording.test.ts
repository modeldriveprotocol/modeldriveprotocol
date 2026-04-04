import { describe, expect, it, vi } from 'vitest'

import { createRouteClientConfig } from '../src/shared/config.js'
import { registerRouteClientCapabilities } from '../src/background/capabilities/route.js'
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
              kind: 'flow',
              id: 'flow-script',
              enabled: true,
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

  it('preserves configured HTTP methods for route code assets and exposes input schemas for non-GET calls', () => {
    const descriptors = new Map<string, Record<string, unknown>>()
    const client = {
      expose(path: string, descriptor: Record<string, unknown>) {
        descriptors.set(path, descriptor)
      }
    }

    registerRouteClientCapabilities(
      client as any,
      {
        getRouteClient: vi.fn(),
        listRouteRecordings: vi.fn().mockResolvedValue([]),
        listRouteSelectorResources: vi.fn().mockResolvedValue([]),
        getStatus: vi.fn(),
        getConfig: vi.fn(),
        listWorkspaceClients: vi.fn(),
        createWorkspaceClient: vi.fn(),
        updateWorkspaceClient: vi.fn(),
        deleteWorkspaceClient: vi.fn(),
        addExposeRuleToClient: vi.fn(),
        listGrantedOrigins: vi.fn(),
        listTabs: vi.fn(),
        activateTab: vi.fn(),
        reloadTab: vi.fn(),
        createTab: vi.fn(),
        closeTab: vi.fn(),
        showNotification: vi.fn(),
        openOptionsPage: vi.fn(),
        runPageCommandForRouteClient: vi.fn()
      } as any,
      createRouteClientConfig({
        id: 'route-rest-methods',
        clientId: 'route-rest-methods',
        matchPatterns: ['https://app.example.com/*'],
        recordings: [
          {
            kind: 'flow',
            id: 'flow-delete',
            enabled: true,
            path: 'orders/delete',
            name: 'Delete order',
            description: 'Delete an order from the page.',
            method: 'DELETE',
            mode: 'script',
            createdAt: '2026-04-05T00:00:00.000Z',
            updatedAt: '2026-04-05T00:00:00.000Z',
            capturedFeatures: [],
            steps: [],
            scriptSource: 'return { deleted: true };'
          }
        ],
        selectorResources: [
          {
            kind: 'resource',
            id: 'resource-patch',
            enabled: true,
            path: 'orders/selection',
            name: 'Order selection',
            description: 'Patch selection state in the page.',
            method: 'PATCH',
            createdAt: '2026-04-05T00:00:00.000Z',
            selector: '[data-order]',
            alternativeSelectors: [],
            tagName: 'DIV',
            classes: [],
            attributes: {},
            scriptSource: 'return { ok: true };'
          }
        ]
      })
    )

    expect(descriptors.get('/orders/delete')).toMatchObject({
      method: 'DELETE',
      inputSchema: expect.any(Object)
    })
    expect(descriptors.get('/orders/selection')).toMatchObject({
      method: 'PATCH',
      inputSchema: expect.any(Object),
      contentType: 'application/json'
    })
  })
})
