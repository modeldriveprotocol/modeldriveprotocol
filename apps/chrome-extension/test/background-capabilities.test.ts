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
  const paths: string[] = []

  return {
    paths,
    client: {
      expose(path: string) {
        paths.push(path)
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

    expect(stub.paths).toHaveLength(
      BACKGROUND_TOOL_DEFINITIONS.length +
        BACKGROUND_RESOURCE_DEFINITIONS.length -
        3
    )
    expect(stub.paths).not.toContain('/extension/tabs')
    expect(stub.paths).not.toContain('/extension/show-notification')
    expect(stub.paths).not.toContain('/extension/resources/tabs')
  })
})
