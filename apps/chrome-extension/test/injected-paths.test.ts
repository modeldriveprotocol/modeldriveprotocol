import { describe, expect, it, vi } from 'vitest'

import { createRouteClientConfig } from '../src/shared/config.js'
import { registerPageInjectedPaths } from '../src/background/capabilities/route/page-injected-paths.js'
import {
  callInjectedPathForRouteClient,
  injectPathScriptForRouteClient
} from '../src/background/runtime/route-sessions.js'

describe('chrome extension injected bridge paths', () => {
  it('registers only canonical injected path endpoints', () => {
    const routeClient = createRouteClientConfig({
      id: 'route-app',
      clientId: 'route-app',
      matchPatterns: ['https://app.example.com/*']
    })
    const runtime = {
      injectPathScriptForRouteClient: vi.fn(),
      getInjectedStateForRouteClient: vi.fn(),
      listInjectedPathsForRouteClient: vi.fn(),
      callInjectedPathForRouteClient: vi.fn(),
      runPageCommandForRouteClient: vi.fn()
    } as any
    const exposures: string[] = []
    const client = {
      expose(path: string) {
        exposures.push(path)
      }
    } as any

    registerPageInjectedPaths(client, runtime, routeClient)

    expect(exposures).toEqual([
      '/page/run-main-world-script',
      '/page/inject-path-script',
      '/page/injected-state',
      '/page/injected-paths',
      '/page/call-injected-path'
    ])
  })

  it('sends canonical main-world actions for injected path operations', async () => {
    const routeClient = createRouteClientConfig({
      id: 'route-app',
      clientId: 'route-app',
      matchPatterns: ['https://app.example.com/*']
    })
    const sendPageCommand = vi.fn().mockResolvedValue({ ok: true })
    const runtime = {
      getRouteClient: vi.fn().mockResolvedValue(routeClient),
      resolveAllowedPageTabForRouteClient: vi.fn().mockResolvedValue({ id: 17 }),
      sendPageCommand,
      ensureScriptsInjected: vi.fn(),
      dispatchPageCommand: vi.fn(),
      listInjectedPaths: vi.fn().mockResolvedValue([
        {
          path: '/app/state',
          description: 'Read app state'
        }
      ])
    } as any

    await callInjectedPathForRouteClient(runtime, routeClient.id, {
      path: '/app/state',
      pathArgs: { includeDrafts: true }
    })

    expect(sendPageCommand).toHaveBeenCalledWith(
      17,
      expect.objectContaining({ id: routeClient.id }),
      {
        type: 'runMainWorld',
        action: 'callPath',
        args: {
          path: '/app/state',
          pathArgs: {
            includeDrafts: true
          }
        }
      }
    )
  })

  it('returns injected path descriptors after script execution', async () => {
    const routeClient = createRouteClientConfig({
      id: 'route-app',
      clientId: 'route-app',
      matchPatterns: ['https://app.example.com/*']
    })
    const runtime = {
      getRouteClient: vi.fn().mockResolvedValue(routeClient),
      resolveAllowedPageTabForRouteClient: vi.fn().mockResolvedValue({ id: 17 }),
      ensureScriptsInjected: vi.fn(),
      dispatchPageCommand: vi.fn(),
      listInjectedPaths: vi.fn().mockResolvedValue([
        {
          path: '/app/state',
          description: 'Read app state'
        },
        {
          path: '/app/health',
          description: 'Read health'
        }
      ])
    } as any

    const pathDescriptors = await injectPathScriptForRouteClient(runtime, routeClient.id, {
      source: 'window.__MDP_EXTENSION_BRIDGE__.registerPath("/app/state", () => ({}))'
    })

    expect(pathDescriptors).toEqual([
      {
        path: '/app/state',
        description: 'Read app state'
      },
      {
        path: '/app/health',
        description: 'Read health'
      }
    ])
  })
})
