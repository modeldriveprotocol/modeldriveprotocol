import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_WORKSPACE_MANAGEMENT_CLIENT,
  STORAGE_KEY,
  type ExtensionConfig
} from '../src/shared/config.js'
import { registerBackgroundCapabilities } from '../src/background/capabilities/index.js'
import { ChromeExtensionRuntime } from '../src/background/runtime.js'

type ExposedHandler = (request?: {
  params?: Record<string, unknown>
  queries?: Record<string, unknown>
  body?: unknown
}) => Promise<unknown> | unknown

function createCapabilityHarness() {
  const handlers = new Map<string, ExposedHandler>()

  return {
    client: {
      expose(_path: string, _descriptor: unknown, handler: ExposedHandler) {
        handlers.set(_path, handler)
      }
    },
    async invoke(path: string, request?: {
      params?: Record<string, unknown>
      queries?: Record<string, unknown>
      body?: unknown
    }) {
      const handler = handlers.get(path)

      if (!handler) {
        throw new Error(`Missing exposed handler for ${path}`)
      }

      return handler(request ?? {})
    }
  }
}

describe('workspace management background client end-to-end flow', () => {
  const storageState: Record<string, unknown> = {}

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn(async (key?: string | string[]) => {
            if (typeof key === 'string') {
              return { [key]: storageState[key] }
            }

            if (Array.isArray(key)) {
              return Object.fromEntries(key.map((item) => [item, storageState[item]]))
            }

            return { ...storageState }
          }),
          set: vi.fn(async (value: Record<string, unknown>) => {
            Object.assign(storageState, value)
          })
        }
      }
    })
    delete storageState[STORAGE_KEY]
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('lets an MDP peer manage clients and persist expose rules through the default workspace client', async () => {
    const runtime = new ChromeExtensionRuntime()
    runtime.refresh = vi.fn().mockResolvedValue(undefined)

    const harness = createCapabilityHarness()
    registerBackgroundCapabilities(
      harness.client as any,
      runtime,
      DEFAULT_WORKSPACE_MANAGEMENT_CLIENT
    )

    const skill = await harness.invoke(
      '/extension/clients/SKILL.md'
    )
    expect(skill).toContain('/extension/clients/create')
    expect(skill).toContain('/extension/clients/delete')

    const initialSnapshot = (await harness.invoke(
      '/extension/clients'
    )) as {
      backgroundClients: Array<{ id: string }>
      routeClients: Array<{ id: string }>
    }

    expect(
      initialSnapshot.backgroundClients.map((client) => client.id)
    ).toContain(DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.id)
    expect(initialSnapshot.routeClients).toEqual([])

    const created = (await harness.invoke('/extension/clients/create', {
      body: {
        kind: 'route',
        clientName: 'Billing Route',
        clientId: 'mdp-billing-route',
        matchPatterns: ['https://app.example.com/*']
      }
    })) as {
      client: {
        id: string
        clientId: string
        clientName: string
      }
    }

    expect(created.client).toMatchObject({
      clientId: 'mdp-billing-route',
      clientName: 'Billing Route'
    })

    await vi.runAllTimersAsync()
    expect(runtime.refresh).toHaveBeenCalledTimes(1)

    const updated = (await harness.invoke('/extension/clients/update', {
      body: {
        kind: 'route',
        id: created.client.id,
        clientDescription: 'Handles billing automation'
      }
    })) as {
      client: {
        id: string
        clientDescription: string
      }
    }

    expect(updated.client).toMatchObject({
      id: created.client.id,
      clientDescription: 'Handles billing automation'
    })

    await vi.runAllTimersAsync()
    expect(runtime.refresh).toHaveBeenCalledTimes(2)

    const addedRule = (await harness.invoke('/extension/clients/add-expose-rule', {
      body: {
        id: created.client.id,
        mode: 'pathname-prefix',
        value: '/billing'
      }
    })) as {
      client: {
        id: string
        routeRules: Array<{ mode: string; value: string }>
      }
      routeRule: {
        mode: string
        value: string
      }
      duplicate: boolean
    }

    expect(addedRule.duplicate).toBe(false)
    expect(addedRule.routeRule).toMatchObject({
      mode: 'pathname-prefix',
      value: '/billing'
    })
    expect(addedRule.client.routeRules).toContainEqual(
      expect.objectContaining({
        mode: 'pathname-prefix',
        value: '/billing'
      })
    )

    await vi.runAllTimersAsync()
    expect(runtime.refresh).toHaveBeenCalledTimes(3)

    const persisted = storageState[STORAGE_KEY] as ExtensionConfig
    const persistedRouteClient = persisted.routeClients.find(
      (client) => client.id === created.client.id
    )

    expect(persistedRouteClient).toMatchObject({
      clientId: 'mdp-billing-route',
      clientDescription: 'Handles billing automation'
    })
    expect(persistedRouteClient?.routeRules).toContainEqual(
      expect.objectContaining({
        mode: 'pathname-prefix',
        value: '/billing'
      })
    )

    const deleted = (await harness.invoke('/extension/clients/delete', {
      body: {
        kind: 'route',
        id: created.client.id
      }
    })) as {
      client: {
        id: string
        kind: string
      }
    }

    expect(deleted.client).toMatchObject({
      id: created.client.id,
      kind: 'route'
    })

    await vi.runAllTimersAsync()
    expect(runtime.refresh).toHaveBeenCalledTimes(4)

    const finalSnapshot = (await harness.invoke('/extension/clients')) as {
      routeClients: Array<{ id: string }>
    }

    expect(finalSnapshot.routeClients).toEqual([])
  })

  it('lets an MDP peer manage background clients by clientId and protects the required client', async () => {
    const runtime = new ChromeExtensionRuntime()
    runtime.refresh = vi.fn().mockResolvedValue(undefined)

    const harness = createCapabilityHarness()
    registerBackgroundCapabilities(
      harness.client as any,
      runtime,
      DEFAULT_WORKSPACE_MANAGEMENT_CLIENT
    )

    const created = (await harness.invoke('/extension/clients/create', {
      body: {
        kind: 'background',
        clientId: 'mdp-workspace-helper',
        clientName: 'Workspace Helper',
        clientDescription: 'Extra background client managed through the workspace client.',
        disabledExposePaths: [
          '/extension/status',
          '/extension/resources/status',
          '/extension/clients/SKILL.md'
        ]
      }
    })) as {
      client: {
        id: string
        clientId: string
        clientName: string
        disabledExposePaths: string[]
      }
    }

    expect(created.client).toMatchObject({
      clientId: 'mdp-workspace-helper',
      clientName: 'Workspace Helper',
      disabledExposePaths: [
        '/extension/status',
        '/extension/resources/status',
        '/extension/clients/SKILL.md'
      ]
    })

    await vi.runAllTimersAsync()

    const updated = (await harness.invoke('/extension/clients/update', {
      body: {
        kind: 'background',
        clientId: 'mdp-workspace-helper',
        clientName: 'Workspace Helper Updated',
        enabled: false
      }
    })) as {
      client: {
        clientId: string
        clientName: string
        enabled: boolean
      }
    }

    expect(updated.client).toMatchObject({
      clientId: 'mdp-workspace-helper',
      clientName: 'Workspace Helper Updated',
      enabled: false
    })

    await vi.runAllTimersAsync()

    await expect(
      harness.invoke('/extension/clients/delete', {
        body: {
          kind: 'background',
          id: DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.id
        }
      })
    ).rejects.toThrow('is required')

    const deleted = (await harness.invoke('/extension/clients/delete', {
      body: {
        kind: 'background',
        clientId: 'mdp-workspace-helper'
      }
    })) as {
      client: {
        kind: string
        clientId: string
        clientName: string
      }
    }

    expect(deleted.client).toMatchObject({
      kind: 'background',
      clientId: 'mdp-workspace-helper',
      clientName: 'Workspace Helper Updated'
    })

    await vi.runAllTimersAsync()

    const persisted = storageState[STORAGE_KEY] as ExtensionConfig

    expect(
      persisted.backgroundClients.some((client) => client.clientId === 'mdp-workspace-helper')
    ).toBe(false)
    expect(
      persisted.backgroundClients.some(
        (client) => client.id === DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.id
      )
    ).toBe(true)
  })

  it('supports prepend and duplicate handling for route expose rules through the exposed endpoints', async () => {
    const runtime = new ChromeExtensionRuntime()
    runtime.refresh = vi.fn().mockResolvedValue(undefined)

    const harness = createCapabilityHarness()
    registerBackgroundCapabilities(
      harness.client as any,
      runtime,
      DEFAULT_WORKSPACE_MANAGEMENT_CLIENT
    )

    const created = (await harness.invoke('/extension/clients/create', {
      body: {
        kind: 'route',
        clientId: 'mdp-billing-rules',
        clientName: 'Billing Rules',
        matchPatterns: ['https://app.example.com/*']
      }
    })) as {
      client: {
        id: string
        clientId: string
      }
    }

    await vi.runAllTimersAsync()

    const firstRule = (await harness.invoke('/extension/clients/add-expose-rule', {
      body: {
        clientId: created.client.clientId,
        mode: 'pathname-prefix',
        value: '/billing/history'
      }
    })) as {
      client: {
        routeRules: Array<{ value: string }>
      }
    }

    expect(firstRule.client.routeRules.map((rule) => rule.value)).toEqual([
      '/billing/history'
    ])

    await vi.runAllTimersAsync()

    const prepended = (await harness.invoke('/extension/clients/add-expose-rule', {
      body: {
        clientId: created.client.clientId,
        mode: 'pathname-prefix',
        value: '/billing',
        prepend: true
      }
    })) as {
      client: {
        routeRules: Array<{ value: string }>
      }
      duplicate: boolean
    }

    expect(prepended.duplicate).toBe(false)
    expect(prepended.client.routeRules.map((rule) => rule.value)).toEqual([
      '/billing',
      '/billing/history'
    ])

    await vi.runAllTimersAsync()

    const duplicate = (await harness.invoke('/extension/clients/add-expose-rule', {
      body: {
        clientId: created.client.clientId,
        mode: 'pathname-prefix',
        value: '/billing'
      }
    })) as {
      client: {
        routeRules: Array<{ value: string }>
      }
      duplicate: boolean
    }

    expect(duplicate.duplicate).toBe(true)
    expect(duplicate.client.routeRules.map((rule) => rule.value)).toEqual([
      '/billing',
      '/billing/history'
    ])

    await vi.runAllTimersAsync()

    const persisted = storageState[STORAGE_KEY] as ExtensionConfig
    const persistedRouteClient = persisted.routeClients.find(
      (client) => client.clientId === created.client.clientId
    )

    expect(persistedRouteClient?.routeRules.map((rule) => rule.value)).toEqual([
      '/billing',
      '/billing/history'
    ])
  })
})
