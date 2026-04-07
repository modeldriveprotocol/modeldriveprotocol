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
            onCloseDetail={vi.fn()}
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

  function setInputValue(input: HTMLInputElement, value: string) {
    const descriptor = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )
    descriptor?.set?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
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

  it('clears the search input from the clear action', async () => {
    await renderSection()

    const searchInput = container.querySelector(
      'input[placeholder="Search market clients, sources, and tags"]'
    ) as HTMLInputElement | null

    expect(searchInput).toBeTruthy()

    await act(async () => {
      setInputValue(searchInput!, 'starter')
    })

    const clearButton = container.querySelector(
      'button[aria-label="Clear search"]'
    ) as HTMLButtonElement | null

    expect(clearButton).toBeTruthy()

    await act(async () => {
      clearButton?.click()
    })

    expect(searchInput?.value).toBe('')
  })

  it('focuses the search input from the keyboard shortcut', async () => {
    await renderSection()

    const searchInput = container.querySelector(
      'input[placeholder="Search market clients, sources, and tags"]'
    ) as HTMLInputElement | null

    expect(searchInput).toBeTruthy()
    expect(document.activeElement).not.toBe(searchInput)

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: '/', bubbles: true })
      )
    })

    expect(document.activeElement).toBe(searchInput)
  })

  it('opens the highlighted result when using arrow keys from the search field', async () => {
    const onOpenDetail = vi.fn()
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
        },
        {
          id: 'admin-console',
          title: 'Admin Console',
          summary: 'Admin summary',
          icon: 'route',
          tags: ['admin'],
          template: {
            kind: 'route',
            id: 'market-template-admin',
            createdAt: new Date().toISOString(),
            enabled: true,
            favorite: false,
            pinned: false,
            clientId: 'admin-console',
            clientName: 'Admin Console',
            clientDescription: 'Admin summary',
            icon: 'route',
            matchPatterns: ['https://example.com/admin/*'],
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

    await renderSection({ onOpenDetail })

    const searchInput = container.querySelector(
      'input[placeholder="Search market clients, sources, and tags"]'
    ) as HTMLInputElement | null

    expect(searchInput).toBeTruthy()

    await act(async () => {
      searchInput?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      )
      searchInput?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      )
    })

    const selectedRow = container.querySelector(
      '.market-entry-row-button.Mui-selected'
    ) as HTMLElement | null

    expect(selectedRow?.textContent).toContain('Admin Console')
    expect(onOpenDetail).toHaveBeenCalledWith('market-source-test:admin-console')
  })

  it('offers a quick clear action when the search has no results', async () => {
    await renderSection()

    const searchInput = container.querySelector(
      'input[placeholder="Search market clients, sources, and tags"]'
    ) as HTMLInputElement | null

    expect(searchInput).toBeTruthy()

    await act(async () => {
      setInputValue(searchInput!, 'missing-result')
    })

    expect(container.textContent).toContain('No market client matches this search.')

    const clearButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Clear search')
    ) as HTMLButtonElement | undefined

    expect(clearButton).toBeTruthy()

    await act(async () => {
      clearButton?.click()
    })

    expect(container.textContent).toContain('Starter client')
    expect(searchInput?.value).toBe('')
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

  it('confirms before removing a source', async () => {
    vi.useFakeTimers()
    const onRemoveSource = vi.fn()

    await renderSection({ onRemoveSource })

    const toggleButton = container.querySelector(
      'button[aria-label="Show source controls"]'
    ) as HTMLButtonElement | null

    await act(async () => {
      toggleButton?.click()
    })

    const sourceRow = Array.from(
      container.querySelectorAll('.MuiListItemButton-root')
    ).find((element) => element.textContent?.includes('Example catalog')) as HTMLElement | undefined

    expect(sourceRow).toBeTruthy()

    await act(async () => {
      sourceRow?.dispatchEvent(new FocusEvent('focus', { bubbles: true }))
      sourceRow?.focus()
      await vi.advanceTimersByTimeAsync(300)
    })

    const deleteButton = container.querySelector(
      'button[aria-label="Remove source"]'
    ) as HTMLButtonElement | null

    expect(deleteButton).toBeTruthy()

    await act(async () => {
      deleteButton?.click()
    })

    expect(onRemoveSource).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Remove this source?')

    const confirmButton = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Remove')
    ) as HTMLButtonElement | undefined

    expect(confirmButton).toBeTruthy()

    await act(async () => {
      confirmButton?.click()
    })

    expect(onRemoveSource).toHaveBeenCalledWith('market-source-test')
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

  it('closes the detail view from Escape', async () => {
    const onCloseDetail = vi.fn()

    await renderSection({
      marketDetailOpen: true,
      onCloseDetail,
      selectedEntryKey: 'market-source-test:starter-client'
    })

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    })

    expect(onCloseDetail).toHaveBeenCalledTimes(1)
  })
})
