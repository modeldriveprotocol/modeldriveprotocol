import { describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_EXTENSION_CONFIG,
  createRouteClientConfig
} from '../src/shared/config.js'
import { getRuntimeStatus } from '../src/background/runtime/status.js'
import { createClientKey } from '../src/background/shared.js'
import * as storageModule from '../src/shared/storage.js'

describe('chrome extension runtime status', () => {
  it('keeps a route client active when any open tab matches it', async () => {
    vi.spyOn(storageModule, 'loadMarketSourceSyncState').mockResolvedValue({
      pendingUpdates: []
    } as any)

    const routeClient = createRouteClientConfig({
      id: 'route-app',
      clientId: 'route-app',
      clientName: 'App Route',
      matchPatterns: ['https://app.example.com/*']
    })

    const runtime = {
      getConfig: vi.fn().mockResolvedValue({
        ...DEFAULT_EXTENSION_CONFIG,
        routeClients: [routeClient],
        backgroundClients: []
      }),
      getPermissionState: vi.fn().mockResolvedValue({
        granted: []
      }),
      getActiveTab: vi.fn().mockResolvedValue({
        id: 91,
        url: 'chrome-extension://test/options.html',
        title: 'Options',
        active: true
      }),
      listTabs: vi.fn().mockResolvedValue([
        {
          id: 91,
          url: 'chrome-extension://test/options.html',
          title: 'Options',
          active: true
        },
        {
          id: 17,
          url: 'https://app.example.com/dashboard',
          title: 'App Dashboard',
          active: false
        }
      ]),
      safeGetMainWorldState: vi.fn(),
      clientStates: new Map([
        [
          createClientKey('route', routeClient.id),
          {
            connectionState: 'connected',
            lastConnectedAt: '2026-03-25T12:00:00.000Z'
          }
        ]
      ]),
      clientTelemetry: new Map()
    } as any

    const status = await getRuntimeStatus(runtime)
    const client = status.clients.find((item) => item.id === routeClient.id)

    expect(client).toMatchObject({
      id: routeClient.id,
      matchesActiveTab: false,
      matchingTabCount: 1,
      connectionState: 'connected'
    })
    expect(status.activeRouteClientIds).toEqual([])
  })

  it('marks a normal web page as eligible even before any route client matches it', async () => {
    vi.spyOn(storageModule, 'loadMarketSourceSyncState').mockResolvedValue({
      pendingUpdates: []
    } as any)

    const runtime = {
      getConfig: vi.fn().mockResolvedValue(DEFAULT_EXTENSION_CONFIG),
      getPermissionState: vi.fn().mockResolvedValue({
        granted: []
      }),
      getActiveTab: vi.fn().mockResolvedValue({
        id: 21,
        url: 'https://news.example.com/article',
        title: 'Example News',
        active: true
      }),
      listTabs: vi.fn().mockResolvedValue([
        {
          id: 21,
          url: 'https://news.example.com/article',
          title: 'Example News',
          active: true
        }
      ]),
      safeGetMainWorldState: vi.fn(),
      clientStates: new Map(),
      clientTelemetry: new Map()
    } as any

    const status = await getRuntimeStatus(runtime)

    expect(status.activeTab).toMatchObject({
      id: 21,
      eligible: true
    })
    expect(status.activeRouteClientIds).toEqual([])
  })
})
