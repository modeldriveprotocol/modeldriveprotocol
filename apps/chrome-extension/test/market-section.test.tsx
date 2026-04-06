// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MarketSourceConfig } from '../src/shared/config.js'
import { I18nProvider } from '../src/ui/i18n/provider.js'
import { MarketSection } from '../src/ui/apps/options/sections/market-section.js'

const fetchMarketCatalogMock = vi.hoisted(() => vi.fn())

vi.mock('../src/ui/market/catalog.js', async () => {
  const actual = await vi.importActual<typeof import('../src/ui/market/catalog.js')>(
    '../src/ui/market/catalog.js'
  )

  return {
    ...actual,
    fetchMarketCatalog: fetchMarketCatalogMock
  }
})

describe('market section', () => {
  let container: HTMLDivElement
  let root: Root

  const marketSource: MarketSourceConfig = {
    id: 'market-source-test',
    kind: 'direct',
    url: 'https://example.com/catalog.json'
  }

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

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

    fetchMarketCatalogMock.mockResolvedValue({
      source: marketSource,
      title: 'Example catalog',
      version: '1.0.0',
      compatible: true,
      clients: [
        {
          id: 'starter-client',
          title: 'Starter client',
          summary: 'Starter summary',
          icon: 'route',
          tags: ['starter'],
          template: {
            kind: 'route',
            id: 'market-template-starter',
            createdAt: new Date().toISOString(),
            enabled: true,
            favorite: false,
            pinned: false,
            clientId: 'starter-client',
            clientName: 'Starter client',
            clientDescription: 'Starter summary',
            icon: 'route',
            matchPatterns: ['https://example.com/*'],
            routeRules: [],
            autoInjectBridge: true,
            pathScriptSource: '',
            exposes: [],
            recordings: [],
            selectorResources: [],
            skillFolders: [],
            skillEntries: []
          }
        }
      ]
    })
  })

  afterEach(async () => {
    vi.useRealTimers()
    await act(async () => {
      root.unmount()
    })
    vi.unstubAllGlobals()
    container.remove()
  })

  async function renderSection(props?: Partial<Parameters<typeof MarketSection>[0]>) {
    await act(async () => {
      root.render(
        <I18nProvider>
          <MarketSection
            marketDetailOpen={false}
            marketSources={[marketSource]}
            marketUpdates={undefined}
            routeClients={[]}
            selectedEntryKey={undefined}
            onAddSource={vi.fn().mockResolvedValue(undefined)}
            onDetailTitleChange={vi.fn()}
            onOpenDetail={vi.fn()}
            onInstall={vi.fn()}
            onRemoveSource={vi.fn()}
            {...props}
          />
        </I18nProvider>
      )
    })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  it('shows source controls inline when the toolbar toggle is opened', async () => {
    await renderSection()

    expect(container.textContent).toContain('Starter client')
    expect(container.querySelector('input[aria-label="Catalog URL"]')).toBeNull()

    const toggleButton = container.querySelector(
      'button[aria-label="Show source controls"]'
    ) as HTMLButtonElement | null

    expect(toggleButton).toBeTruthy()

    await act(async () => {
      toggleButton?.click()
    })

    expect(container.textContent).toContain('Sources')
    expect(container.textContent).toContain('Catalog URL')
    expect(container.textContent).toContain('Example catalog')
  })

  it('starts editing a source when the source row is clicked', async () => {
    await renderSection()

    const toggleButton = container.querySelector(
      'button[aria-label="Show source controls"]'
    ) as HTMLButtonElement | null

    await act(async () => {
      toggleButton?.click()
    })

    const sourceRow = Array.from(
      container.querySelectorAll('.MuiListItemButton-root')
    ).find((element) => element.textContent?.includes('Example catalog'))

    expect(sourceRow).toBeTruthy()

    await act(async () => {
      sourceRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const sourceInput = container.querySelector(
      'input[value="https://example.com/catalog.json"]'
    ) as HTMLInputElement | null

    expect(sourceInput).toBeTruthy()

    await act(async () => {
      sourceInput?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    })

    expect(
      container.querySelector('input[value="https://example.com/catalog.json"]')
    ).toBeNull()
  })

  it('opens the market detail view and installs from the detail action', async () => {
    const onInstall = vi.fn()
    const onOpenDetail = vi.fn()

    await renderSection({ onInstall, onOpenDetail })

    const rowButton = container.querySelector(
      '.market-entry-row-button'
    ) as HTMLElement | null

    expect(rowButton).toBeTruthy()

    await act(async () => {
      rowButton?.click()
    })

    expect(onOpenDetail).toHaveBeenCalledWith('market-source-test:starter-client')

    await renderSection({
      marketDetailOpen: true,
      onInstall,
      selectedEntryKey: 'market-source-test:starter-client'
    })

    const installButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Install')
    ) as HTMLButtonElement | undefined

    expect(installButton).toBeTruthy()

    await act(async () => {
      installButton?.click()
    })

    expect(onInstall).toHaveBeenCalledTimes(1)
  })
})
