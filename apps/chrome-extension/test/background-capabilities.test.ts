import { describe, expect, it, vi } from 'vitest'

import {
  BACKGROUND_BROWSER_EXPOSE_DEFINITIONS,
  BACKGROUND_SKILL_EXPOSE_DEFINITIONS,
  BACKGROUND_WORKSPACE_EXPOSE_DEFINITIONS,
  DEFAULT_BACKGROUND_CLIENT,
  DEFAULT_WORKSPACE_MANAGEMENT_CLIENT
} from '../src/shared/config.js'
import { registerBackgroundCapabilities } from '../src/background/capabilities/index.js'

function createRuntimeStub() {
  return {
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
    openOptionsPage: vi.fn()
  }
}

function createClientStub() {
  const paths: string[] = []
  const descriptors = new Map<string, Record<string, unknown>>()
  const handlers = new Map<string, (request?: unknown) => unknown>()

  return {
    paths,
    descriptors,
    handlers,
    client: {
      expose(
        path: string,
        descriptor?: Record<string, unknown>,
        handler?: (request?: unknown) => unknown
      ) {
        paths.push(path)
        if (descriptor) {
          descriptors.set(path, descriptor)
        }
        if (handler) {
          handlers.set(path, handler)
        }
      }
    }
  }
}

describe('chrome extension background capabilities', () => {
  it('registers every background capability when they are enabled', () => {
    const runtime = createRuntimeStub()
    const stub = createClientStub()

    registerBackgroundCapabilities(
      stub.client as any,
      runtime as any,
      {
        ...DEFAULT_BACKGROUND_CLIENT,
        exposes: DEFAULT_BACKGROUND_CLIENT.exposes.map((asset) => ({
          ...asset,
          enabled: true
        })),
        disabledExposePaths: []
      }
    )

    expect(stub.paths).toHaveLength(
      BACKGROUND_BROWSER_EXPOSE_DEFINITIONS.length +
        BACKGROUND_WORKSPACE_EXPOSE_DEFINITIONS.length +
        BACKGROUND_SKILL_EXPOSE_DEFINITIONS.length
    )
    expect(stub.paths).toContain('/clients')
    expect(stub.paths).toContain('/SKILL.md')
    expect(stub.paths).toContain('/clients/SKILL.md')
    expect(stub.paths).toContain(
      '/clients/.ai/skills/manage-client-expose-rules/SKILL.md'
    )
    expect(stub.paths).toContain('/resources/SKILL.md')
  })

  it('keeps workspace management capabilities scoped to the dedicated default client', () => {
    const runtime = createRuntimeStub()
    const browserClient = createClientStub()
    const workspaceClient = createClientStub()

    registerBackgroundCapabilities(
      browserClient.client as any,
      runtime as any,
      DEFAULT_BACKGROUND_CLIENT
    )
    registerBackgroundCapabilities(
      workspaceClient.client as any,
      runtime as any,
      DEFAULT_WORKSPACE_MANAGEMENT_CLIENT
    )

    expect(browserClient.paths).not.toContain('/clients')
    expect(browserClient.paths).toContain('/SKILL.md')
    expect(browserClient.paths).toContain('/resources/SKILL.md')
    expect(browserClient.paths).not.toContain('/clients/SKILL.md')
    expect(workspaceClient.paths).toContain('/clients')
    expect(workspaceClient.paths).toContain('/SKILL.md')
    expect(workspaceClient.paths).toContain(
      '/clients/.ai/skills/manage-client-expose-rules/SKILL.md'
    )
    expect(workspaceClient.paths).toContain('/clients/SKILL.md')
    expect(workspaceClient.paths).not.toContain('/resources/SKILL.md')
    expect(workspaceClient.paths).not.toContain('/tabs')
  })

  it('registers background capabilities from the configured expose assets', () => {
    const runtime = createRuntimeStub()
    const stub = createClientStub()

    registerBackgroundCapabilities(
      stub.client as any,
      runtime as any,
      {
        ...DEFAULT_BACKGROUND_CLIENT,
        exposes: DEFAULT_BACKGROUND_CLIENT.exposes.map((asset) =>
          asset.id === 'extension.status'
            ? {
                ...asset,
                path: '/browser/status',
                description: 'Read status from a custom browser path.'
              }
            : { ...asset }
        )
      }
    )

    expect(stub.paths).toContain('/browser/status')
    expect(stub.paths).not.toContain('/status')
  })

  it('uses REST-style methods for mutating built-in background endpoints', () => {
    expect(
      BACKGROUND_BROWSER_EXPOSE_DEFINITIONS.find(
        (definition) => definition.id === 'extension.activate-tab'
      )?.method
    ).toBe('PATCH')
    expect(
      BACKGROUND_BROWSER_EXPOSE_DEFINITIONS.find(
        (definition) => definition.id === 'extension.close-tab'
      )?.method
    ).toBe('DELETE')
    expect(
      BACKGROUND_WORKSPACE_EXPOSE_DEFINITIONS.find(
        (definition) => definition.id === 'extension.clients.update'
      )?.method
    ).toBe('PATCH')
    expect(
      BACKGROUND_WORKSPACE_EXPOSE_DEFINITIONS.find(
        (definition) => definition.id === 'extension.clients.delete'
      )?.method
    ).toBe('DELETE')
  })

  it('runs built-in background handlers without relying on dynamic eval', async () => {
    const runtime = createRuntimeStub()
    const status = { onlineClientCount: 3 }
    const clients = { backgroundClients: [], routeClients: [] }

    runtime.getStatus.mockResolvedValue(status)
    runtime.listWorkspaceClients.mockResolvedValue(clients)

    const browserStub = createClientStub()
    registerBackgroundCapabilities(
      browserStub.client as any,
      runtime as any,
      DEFAULT_BACKGROUND_CLIENT
    )

    const workspaceStub = createClientStub()
    registerBackgroundCapabilities(
      workspaceStub.client as any,
      runtime as any,
      DEFAULT_WORKSPACE_MANAGEMENT_CLIENT
    )

    await expect(
      browserStub.handlers.get('/status')?.({})
    ).resolves.toEqual(
      status
    )
    await expect(
      workspaceStub.handlers.get('/clients')?.({})
    ).resolves.toEqual(
      clients
    )
    expect(runtime.getStatus).toHaveBeenCalledTimes(1)
    expect(runtime.listWorkspaceClients).toHaveBeenCalledTimes(1)
  })

  it('reports an explicit error when a background expose has custom javascript source', async () => {
    const runtime = createRuntimeStub()
    const stub = createClientStub()

    registerBackgroundCapabilities(
      stub.client as any,
      runtime as any,
      {
        ...DEFAULT_BACKGROUND_CLIENT,
        exposes: DEFAULT_BACKGROUND_CLIENT.exposes.map((asset) =>
          asset.id === 'extension.status'
            ? {
                ...asset,
                source: `${asset.source}\nreturn { overridden: true };`
              }
            : asset
        )
      }
    )

    await expect(
      stub.handlers.get('/status')?.({})
    ).rejects.toThrow(/blocks dynamic code execution/i)
  })
})
