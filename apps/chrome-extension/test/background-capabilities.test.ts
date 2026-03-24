import { describe, expect, it, vi } from 'vitest'

import {
  BACKGROUND_RESOURCE_DEFINITIONS,
  BACKGROUND_TOOL_DEFINITIONS,
  DEFAULT_BACKGROUND_CLIENT
} from '../src/shared/config.js'
import { registerBackgroundCapabilities } from '../src/background/capabilities/index.js'

function createRuntimeStub() {
  return {
    getStatus: vi.fn(),
    getConfig: vi.fn(),
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
  const tools: string[] = []
  const resources: string[] = []

  return {
    tools,
    resources,
    client: {
      exposeTool(name: string) {
        tools.push(name)
      },
      exposeResource(uri: string) {
        resources.push(uri)
      }
    }
  }
}

describe('chrome extension background capabilities', () => {
  it('registers only enabled built-in tools and resources', () => {
    const runtime = createRuntimeStub()
    const stub = createClientStub()

    registerBackgroundCapabilities(
      stub.client as any,
      runtime as any,
      {
        ...DEFAULT_BACKGROUND_CLIENT,
        disabledTools: ['extension.listTabs', 'extension.showNotification'],
        disabledResources: ['chrome-extension://tabs']
      }
    )

    expect(stub.tools).toEqual(
      BACKGROUND_TOOL_DEFINITIONS
        .map((definition) => definition.id)
        .filter((id) => id !== 'extension.listTabs' && id !== 'extension.showNotification')
    )
    expect(stub.resources).toEqual(
      BACKGROUND_RESOURCE_DEFINITIONS
        .map((definition) => definition.id)
        .filter((id) => id !== 'chrome-extension://tabs')
    )
  })
})
