import { describe, expect, it, vi } from 'vitest'

import {
  BACKGROUND_SKILL_DEFINITIONS,
  BACKGROUND_RESOURCE_DEFINITIONS,
  BACKGROUND_TOOL_DEFINITIONS,
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
  it('registers every background capability when they are enabled', () => {
    const runtime = createRuntimeStub()
    const stub = createClientStub()

    registerBackgroundCapabilities(
      stub.client as any,
      runtime as any,
      {
        ...DEFAULT_BACKGROUND_CLIENT,
        disabledTools: [],
        disabledResources: [],
        disabledSkills: []
      }
    )

    expect(stub.paths).toHaveLength(
      BACKGROUND_TOOL_DEFINITIONS.length +
        BACKGROUND_RESOURCE_DEFINITIONS.length +
        BACKGROUND_SKILL_DEFINITIONS.length
    )
    expect(stub.paths).toContain('/extension/clients')
    expect(stub.paths).toContain('/extension/skills/manage-clients/skill.md')
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

    expect(browserClient.paths).not.toContain('/extension/clients')
    expect(browserClient.paths).not.toContain(
      '/extension/skills/manage-clients/skill.md'
    )
    expect(workspaceClient.paths).toContain('/extension/clients')
    expect(workspaceClient.paths).toContain(
      '/extension/skills/manage-client-expose-rules/skill.md'
    )
    expect(workspaceClient.paths).not.toContain('/extension/tabs')
  })
})
