// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_BACKGROUND_CLIENT,
  DEFAULT_EXTENSION_CONFIG
} from '../src/shared/config.js'
import { I18nProvider } from '../src/ui/i18n/provider.js'
import { BackgroundClientEditor } from '../src/ui/apps/options/sections/background-client-editor.js'

vi.mock('../src/ui/foundation/monaco-editor.js', () => ({
  MonacoCodeEditor: ({
    ariaLabel,
    value
  }: {
    ariaLabel: string
    value: string
  }) => <div aria-label={ariaLabel}>{value}</div>
}))

describe('background client editor', () => {
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
    vi.stubGlobal('navigator', {
      ...window.navigator,
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
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

  it('renders a javascript background asset path without crashing', async () => {
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <I18nProvider>
          <BackgroundClientEditor
            client={DEFAULT_EXTENSION_CONFIG.backgroundClients[0] ?? DEFAULT_BACKGROUND_CLIENT}
            draft={DEFAULT_EXTENSION_CONFIG}
            initialAssetPath="/extension/status"
            initialTab="assets"
            invocationStats={undefined}
            onAssetPathChange={() => {}}
            onClearHistory={() => {}}
            onTabChange={() => {}}
            onChange={() => {}}
            runtimeState="connected"
          />
        </I18nProvider>
      )
    })

    expect(container.textContent).toContain('Read the extension workspace status')
    expect(container.textContent).toContain('return await api.getStatus();')
  })

  it('renders the root background SKILL markdown without crashing', async () => {
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <I18nProvider>
          <BackgroundClientEditor
            client={DEFAULT_EXTENSION_CONFIG.backgroundClients[0] ?? DEFAULT_BACKGROUND_CLIENT}
            draft={DEFAULT_EXTENSION_CONFIG}
            initialAssetPath="/extension/SKILL.md"
            initialTab="assets"
            invocationStats={undefined}
            onAssetPathChange={() => {}}
            onClearHistory={() => {}}
            onTabChange={() => {}}
            onChange={() => {}}
            runtimeState="connected"
          />
        </I18nProvider>
      )
    })

    expect(container.textContent).toContain(
      'Overview for the /extension directory and the built-in Chrome extension capabilities exposed from it.'
    )
    expect(container.textContent).toContain('# /extension')
  })

  it('toggles every asset under a folder from the tree control', async () => {
    const root = createRoot(container)
    const onChange = vi.fn()
    const client =
      DEFAULT_EXTENSION_CONFIG.backgroundClients[0] ?? DEFAULT_BACKGROUND_CLIENT

    await act(async () => {
      root.render(
        <I18nProvider>
          <BackgroundClientEditor
            client={client}
            draft={DEFAULT_EXTENSION_CONFIG}
            initialAssetPath="/extension/SKILL.md"
            initialTab="assets"
            invocationStats={undefined}
            onAssetPathChange={() => {}}
            onClearHistory={() => {}}
            onTabChange={() => {}}
            onChange={onChange}
            runtimeState="connected"
          />
        </I18nProvider>
      )
    })

    const toggle = container.querySelector(
      '[id="asset-folder:clients"] [role="button"][aria-label="Disable"]'
    )

    expect(toggle).not.toBeNull()

    await act(async () => {
      toggle?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      )
    })

    expect(onChange).toHaveBeenCalledTimes(1)

    const nextConfig = onChange.mock.calls[0]?.[0]
    const nextClient = nextConfig.backgroundClients.find(
      (item: { id: string }) => item.id === client.id
    )
    const clientAssets = nextClient.exposes.filter((asset: { path: string }) =>
      asset.path.startsWith('/extension/clients/')
    )

    expect(clientAssets.length).toBeGreaterThan(0)
    expect(clientAssets.every((asset: { enabled: boolean }) => !asset.enabled)).toBe(true)
  })
})
