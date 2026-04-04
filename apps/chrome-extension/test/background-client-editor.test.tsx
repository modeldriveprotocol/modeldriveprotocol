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
})
