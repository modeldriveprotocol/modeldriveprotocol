// @vitest-environment jsdom

import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_EXTENSION_CONFIG,
  createRouteClientConfig,
  type ExtensionConfig,
  type RouteClientConfig
} from '../src/shared/config.js'
import { ClientAssetsPanel } from '../src/ui/apps/options/sections/client-assets-panel.js'
import { I18nProvider } from '../src/ui/i18n/provider.js'

vi.mock('../src/ui/foundation/monaco-editor.js', () => ({
  MonacoCodeEditor: ({
    ariaLabel,
    value
  }: {
    ariaLabel: string
    value: string
  }) => <div aria-label={ariaLabel}>{value}</div>
}))

describe('client assets panel', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)

    vi.stubGlobal('chrome', {
      i18n: {
        getUILanguage: () => 'en'
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined)
        },
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn()
        }
      }
    })
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        disconnect() {}
        unobserve() {}
      }
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    container.remove()
  })

  it('switches assets without entering an update loop when the parent rehydrates the client', async () => {
    const root = createRoot(container)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const baseClient = createRouteClientConfig({
      id: 'route-client-ui-verify',
      clientId: 'route-client-ui-verify',
      clientName: 'UI Verify Client',
      exposes: [
        {
          kind: 'skill',
          id: 'route-skill-root',
          enabled: true,
          path: 'SKILL.md',
          metadata: {
            title: 'Root skill',
            summary: 'Root summary',
            queryParameters: [],
            headerParameters: []
          },
          content: '# Root skill'
        },
        {
          kind: 'folder',
          id: 'route-folder-guides',
          path: 'guides'
        },
        {
          kind: 'skill',
          id: 'route-skill-guides',
          enabled: true,
          path: 'guides/SKILL.md',
          metadata: {
            title: 'Guide skill',
            summary: 'Guide summary',
            queryParameters: [],
            headerParameters: []
          },
          content: '# Guide skill'
        }
      ]
    })
    const initialDraft: ExtensionConfig = {
      ...DEFAULT_EXTENSION_CONFIG,
      backgroundClients: [],
      routeClients: [baseClient]
    }

    function Harness() {
      const [draft, setDraft] = useState(initialDraft)
      const [selectedPath, setSelectedPath] = useState<string | undefined>('SKILL.md')
      const client = createRouteClientConfig(
        JSON.parse(JSON.stringify(draft.routeClients[0] as RouteClientConfig))
      )

      return (
        <I18nProvider>
          <ClientAssetsPanel
            client={client}
            draft={draft}
            initialPath={selectedPath}
            initialTab="assets"
            onSelectedPathChange={setSelectedPath}
            onChange={setDraft}
          />
        </I18nProvider>
      )
    }

    await act(async () => {
      root.render(<Harness />)
    })

    expect(container.textContent).toContain('Root summary')
    expect(container.textContent).toContain('# Root skill')

    const guideSkillNode = container.querySelector('#route-asset\\:route-skill-guides')
    expect(guideSkillNode).not.toBeNull()

    await act(async () => {
      guideSkillNode?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      )
    })

    expect(container.textContent).toContain('Guide summary')
    expect(container.textContent).toContain('# Guide skill')

    const rootSkillNode = container.querySelector('#route-asset\\:route-skill-root')
    expect(rootSkillNode).not.toBeNull()

    await act(async () => {
      rootSkillNode?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      )
    })

    expect(container.textContent).toContain('Root summary')
    expect(container.textContent).toContain('# Root skill')
    expect(
      errorSpy.mock.calls.some((call) =>
        String(call[0]).includes('Maximum update depth exceeded')
      )
    ).toBe(false)

    errorSpy.mockRestore()
  })
})
