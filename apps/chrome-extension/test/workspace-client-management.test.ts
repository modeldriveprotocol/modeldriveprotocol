import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_EXTENSION_CONFIG,
  DEFAULT_WORKSPACE_MANAGEMENT_CLIENT,
  createRouteClientConfig,
  normalizeConfig
} from '../src/shared/config.js'
import * as storageModule from '../src/shared/storage.js'
import {
  addExposeRuleToClient,
  createWorkspaceClient,
  deleteWorkspaceClient,
  updateWorkspaceClient
} from '../src/background/runtime/workspace-clients.js'

function createRuntime(config = DEFAULT_EXTENSION_CONFIG) {
  return {
    currentConfig: config,
    getConfig: vi.fn().mockResolvedValue(config),
    refresh: vi.fn().mockResolvedValue(undefined)
  } as any
}

describe('workspace client management runtime helpers', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('creates a new route client and schedules a runtime refresh', async () => {
    vi.useFakeTimers()
    const runtime = createRuntime()
    const saveConfig = vi
      .spyOn(storageModule, 'saveConfig')
      .mockImplementation(async (config) => normalizeConfig(config))

    const result = await createWorkspaceClient(runtime, {
      kind: 'route',
      clientName: 'Billing Route',
      clientId: 'mdp-billing-route',
      matchPatterns: ['https://app.example.com/*']
    })

    expect(result.client).toMatchObject({
      kind: 'route',
      clientId: 'mdp-billing-route',
      clientName: 'Billing Route'
    })
    expect(saveConfig).toHaveBeenCalledTimes(1)
    expect(saveConfig.mock.calls[0]?.[0].routeClients).toHaveLength(1)

    await vi.runAllTimersAsync()

    expect(runtime.refresh).toHaveBeenCalledTimes(1)
  })

  it('updates a background client by id', async () => {
    vi.useFakeTimers()
    const runtime = createRuntime()
    vi.spyOn(storageModule, 'saveConfig').mockImplementation(async (config) =>
      normalizeConfig(config)
    )

    const result = await updateWorkspaceClient(runtime, {
      kind: 'background',
      id: DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.id,
      clientName: 'Workspace Control',
      enabled: false,
      disabledSkills: ['extension.manageClientExposeRules']
    })

    expect(result.client).toMatchObject({
      id: DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.id,
      clientName: 'Workspace Control',
      enabled: false,
      disabledSkills: ['extension.manageClientExposeRules']
    })

    await vi.runAllTimersAsync()

    expect(runtime.refresh).toHaveBeenCalledTimes(1)
  })

  it('creates, updates, and deletes a background client by clientId', async () => {
    vi.useFakeTimers()
    const runtime = createRuntime()
    vi.spyOn(storageModule, 'saveConfig').mockImplementation(async (config) =>
      normalizeConfig(config)
    )

    const created = await createWorkspaceClient(runtime, {
      kind: 'background',
      clientId: 'mdp-workspace-helper',
      clientName: 'Workspace Helper',
      clientDescription: 'Extra background client for workspace automation.',
      disabledTools: ['extension.getStatus'],
      disabledResources: ['chrome-extension://status'],
      disabledSkills: ['extension.manageClients']
    })

    expect(created.client).toMatchObject({
      kind: 'background',
      clientId: 'mdp-workspace-helper',
      clientName: 'Workspace Helper',
      disabledTools: ['extension.getStatus'],
      disabledResources: ['chrome-extension://status'],
      disabledSkills: ['extension.manageClients']
    })

    const createdConfig = normalizeConfig({
      ...DEFAULT_EXTENSION_CONFIG,
      backgroundClients: [...DEFAULT_EXTENSION_CONFIG.backgroundClients, created.client]
    })
    const updateRuntime = createRuntime(createdConfig)
    const updated = await updateWorkspaceClient(updateRuntime, {
      kind: 'background',
      clientId: 'mdp-workspace-helper',
      clientName: 'Workspace Helper Updated',
      enabled: false
    })

    expect(updated.client).toMatchObject({
      clientId: 'mdp-workspace-helper',
      clientName: 'Workspace Helper Updated',
      enabled: false
    })

    const updatedConfig = normalizeConfig({
      ...DEFAULT_EXTENSION_CONFIG,
      backgroundClients: [
        ...DEFAULT_EXTENSION_CONFIG.backgroundClients,
        updated.client
      ]
    })
    const deleteRuntime = createRuntime(updatedConfig)
    const deleted = await deleteWorkspaceClient(deleteRuntime, {
      kind: 'background',
      clientId: 'mdp-workspace-helper'
    })

    expect(deleted.client).toMatchObject({
      kind: 'background',
      clientId: 'mdp-workspace-helper',
      clientName: 'Workspace Helper Updated'
    })

    await vi.runAllTimersAsync()

    expect(runtime.refresh).toHaveBeenCalledTimes(1)
    expect(updateRuntime.refresh).toHaveBeenCalledTimes(1)
    expect(deleteRuntime.refresh).toHaveBeenCalledTimes(1)
  })

  it('rejects deleting the required workspace management client', async () => {
    const runtime = createRuntime()

    await expect(
      deleteWorkspaceClient(runtime, {
        kind: 'background',
        id: DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.id
      })
    ).rejects.toThrow('is required')
  })

  it('persists a route expose rule and reports duplicates', async () => {
    vi.useFakeTimers()
    const routeClient = createRouteClientConfig({
      id: 'route-billing',
      clientId: 'route-billing',
      clientName: 'Billing Route',
      routeRules: []
    })
    const runtime = createRuntime({
      ...DEFAULT_EXTENSION_CONFIG,
      routeClients: [routeClient]
    })
    const saveConfig = vi
      .spyOn(storageModule, 'saveConfig')
      .mockImplementation(async (config) => normalizeConfig(config))

    const added = await addExposeRuleToClient(runtime, {
      kind: 'route',
      id: routeClient.id,
      mode: 'pathname-prefix',
      value: '/billing'
    })

    expect(added.duplicate).toBe(false)
    expect(added.routeRule).toMatchObject({
      mode: 'pathname-prefix',
      value: '/billing'
    })
    expect(saveConfig.mock.calls[0]?.[0].routeClients[0]?.routeRules).toHaveLength(1)

    const duplicateRuntime = createRuntime({
      ...DEFAULT_EXTENSION_CONFIG,
      routeClients: [
        {
          ...routeClient,
          routeRules: [added.routeRule]
        }
      ]
    })

    saveConfig.mockClear()

    const duplicate = await addExposeRuleToClient(duplicateRuntime, {
      kind: 'route',
      id: routeClient.id,
      mode: 'pathname-prefix',
      value: '/billing'
    })

    expect(duplicate.duplicate).toBe(true)

    await vi.runAllTimersAsync()

    expect(runtime.refresh).toHaveBeenCalledTimes(1)
  })

  it('updates a route client by clientId and renames its public clientId', async () => {
    vi.useFakeTimers()
    const routeClient = createRouteClientConfig({
      id: 'route-billing',
      clientId: 'mdp-billing-route',
      clientName: 'Billing Route'
    })
    const runtime = createRuntime({
      ...DEFAULT_EXTENSION_CONFIG,
      routeClients: [routeClient]
    })
    vi.spyOn(storageModule, 'saveConfig').mockImplementation(async (config) =>
      normalizeConfig(config)
    )

    const result = await updateWorkspaceClient(runtime, {
      kind: 'route',
      clientId: 'mdp-billing-route',
      nextClientId: 'mdp-billing-route-v2',
      clientDescription: 'Updated by clientId.',
      favorite: true
    })

    expect(result.client).toMatchObject({
      id: 'route-billing',
      clientId: 'mdp-billing-route-v2',
      clientDescription: 'Updated by clientId.',
      favorite: true
    })

    await vi.runAllTimersAsync()

    expect(runtime.refresh).toHaveBeenCalledTimes(1)
  })

  it('prepends new route rules and keeps duplicate additions idempotent', async () => {
    vi.useFakeTimers()
    const routeClient = createRouteClientConfig({
      id: 'route-billing',
      clientId: 'mdp-billing-route',
      clientName: 'Billing Route',
      routeRules: []
    })
    const runtime = createRuntime({
      ...DEFAULT_EXTENSION_CONFIG,
      routeClients: [routeClient]
    })
    vi.spyOn(storageModule, 'saveConfig').mockImplementation(async (config) =>
      normalizeConfig(config)
    )

    const first = await addExposeRuleToClient(runtime, {
      kind: 'route',
      id: routeClient.id,
      mode: 'pathname-prefix',
      value: '/billing/history'
    })

    const prependRuntime = createRuntime({
      ...DEFAULT_EXTENSION_CONFIG,
      routeClients: [
        {
          ...routeClient,
          routeRules: [first.routeRule]
        }
      ]
    })

    const prepended = await addExposeRuleToClient(prependRuntime, {
      kind: 'route',
      id: routeClient.id,
      mode: 'pathname-prefix',
      value: '/billing',
      prepend: true
    })

    expect(prepended.client.routeRules.map((rule) => rule.value)).toEqual([
      '/billing',
      '/billing/history'
    ])

    const duplicateRuntime = createRuntime({
      ...DEFAULT_EXTENSION_CONFIG,
      routeClients: [prepended.client]
    })

    const duplicate = await addExposeRuleToClient(duplicateRuntime, {
      kind: 'route',
      clientId: prepended.client.clientId,
      mode: 'pathname-prefix',
      value: '/billing'
    })

    expect(duplicate.duplicate).toBe(true)
    expect(duplicate.client.routeRules.map((rule) => rule.value)).toEqual([
      '/billing',
      '/billing/history'
    ])

    await vi.runAllTimersAsync()

    expect(runtime.refresh).toHaveBeenCalledTimes(1)
    expect(prependRuntime.refresh).toHaveBeenCalledTimes(1)
    expect(duplicateRuntime.refresh).toHaveBeenCalledTimes(1)
  })
})
