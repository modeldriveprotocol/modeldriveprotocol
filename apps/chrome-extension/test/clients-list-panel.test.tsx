// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_EXTENSION_CONFIG,
  createRouteClientConfig,
  type ExtensionConfig
} from '../src/shared/config.js'
import { ClientsListPanel } from '../src/ui/apps/options/sections/clients-list-panel.js'
import { I18nProvider } from '../src/ui/i18n/provider.js'

describe('clients list panel', () => {
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
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    container.remove()
  })

  it('filters the list by client type after the panel refactor', async () => {
    const root = createRoot(container)
    const draft: ExtensionConfig = {
      ...DEFAULT_EXTENSION_CONFIG,
      routeClients: [
        createRouteClientConfig({
          id: 'route-client-review',
          clientId: 'route-client-review',
          clientName: 'Route Review Client',
          matchPatterns: ['https://example.com/*']
        })
      ]
    }

    await act(async () => {
      root.render(
        <I18nProvider>
          <ClientsListPanel
            canCreateFromPage={false}
            currentPageUrl="https://example.com/"
            draft={draft}
            routeSearch=""
            runtimeState={undefined}
            selectedClientId={undefined}
            onChange={() => {}}
            onCreateClient={() => {}}
            onCreateClientFromPage={() => {}}
            onOpenDetail={() => {}}
            onRouteSearchChange={() => {}}
            onSelectClient={() => {}}
          />
        </I18nProvider>
      )
    })

    expect(container.textContent).toContain('MDP Chrome Background')
    expect(container.textContent).toContain('Route Review Client')

    const controlsToggleButton = container.querySelector(
      'button[aria-label="Show filters and multi-select"]'
    )

    expect(controlsToggleButton).not.toBeNull()

    await act(async () => {
      controlsToggleButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      )
    })

    const routeFilterButton = container.querySelector(
      'button[aria-label="Route"]'
    )

    expect(routeFilterButton).not.toBeUndefined()

    await act(async () => {
      routeFilterButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      )
    })

    expect(container.textContent).toContain('Route Review Client')
    expect(container.textContent).not.toContain('MDP Chrome Background')
  })

  it('applies a bulk favorite action to the selected client after extraction', async () => {
    const root = createRoot(container)
    const onChange = vi.fn()
    const routeClient = createRouteClientConfig({
      id: 'route-client-review',
      clientId: 'route-client-review',
      clientName: 'Route Review Client',
      favorite: false,
      matchPatterns: ['https://example.com/*']
    })
    const draft: ExtensionConfig = {
      ...DEFAULT_EXTENSION_CONFIG,
      routeClients: [routeClient]
    }

    await act(async () => {
      root.render(
        <I18nProvider>
          <ClientsListPanel
            canCreateFromPage={false}
            currentPageUrl="https://example.com/"
            draft={draft}
            routeSearch=""
            runtimeState={undefined}
            selectedClientId={undefined}
            onChange={onChange}
            onCreateClient={() => {}}
            onCreateClientFromPage={() => {}}
            onOpenDetail={() => {}}
            onRouteSearchChange={() => {}}
            onSelectClient={() => {}}
          />
        </I18nProvider>
      )
    })

    const controlsToggleButton = container.querySelector(
      'button[aria-label="Show filters and multi-select"]'
    )

    expect(controlsToggleButton).not.toBeNull()

    await act(async () => {
      controlsToggleButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      )
    })

    const routeRow = Array.from(container.querySelectorAll('li')).find((item) =>
      item.textContent?.includes('Route Review Client')
    )
    const routeCheckbox = routeRow?.querySelector('input[type="checkbox"]')

    expect(routeCheckbox).not.toBeNull()

    await act(async () => {
      routeCheckbox?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      )
    })

    const favoriteButton = container.querySelector(
      'button[aria-label="Favorite"]'
    )

    expect(favoriteButton).not.toBeNull()

    await act(async () => {
      favoriteButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      )
    })

    expect(onChange).toHaveBeenCalledTimes(1)

    const nextDraft = onChange.mock.calls[0]?.[0] as ExtensionConfig
    expect(nextDraft.routeClients[0]?.favorite).toBe(true)
  })

  it('duplicates a client from the more menu', async () => {
    const root = createRoot(container)
    const onChange = vi.fn()
    const routeClient = createRouteClientConfig({
      id: 'route-client-review',
      clientId: 'route-client-review',
      clientName: 'Route Review Client',
      matchPatterns: ['https://example.com/*']
    })
    const draft: ExtensionConfig = {
      ...DEFAULT_EXTENSION_CONFIG,
      routeClients: [routeClient]
    }

    await act(async () => {
      root.render(
        <I18nProvider>
          <ClientsListPanel
            canCreateFromPage={false}
            currentPageUrl="https://example.com/"
            draft={draft}
            routeSearch=""
            runtimeState={undefined}
            selectedClientId={undefined}
            onChange={onChange}
            onCreateClient={() => {}}
            onCreateClientFromPage={() => {}}
            onOpenDetail={() => {}}
            onRouteSearchChange={() => {}}
            onSelectClient={() => {}}
          />
        </I18nProvider>
      )
    })

    const routeRow = Array.from(container.querySelectorAll('li')).find((item) =>
      item.textContent?.includes('Route Review Client')
    )
    const moreButton = routeRow?.querySelector(
      'button[aria-label="More actions"]'
    )

    expect(moreButton).not.toBeNull()

    await act(async () => {
      moreButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      )
    })

    const copyMenuItem = Array.from(
      document.querySelectorAll('[role="menuitem"]')
    ).find((item) => item.textContent?.includes('Copy'))

    expect(copyMenuItem).not.toBeUndefined()

    await act(async () => {
      copyMenuItem?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      )
    })

    expect(onChange).toHaveBeenCalledTimes(1)

    const nextDraft = onChange.mock.calls[0]?.[0] as ExtensionConfig
    expect(nextDraft.routeClients).toHaveLength(2)
    expect(nextDraft.routeClients[1]?.clientName).toBe('Route Review Client Copy')
    expect(nextDraft.routeClients[1]?.favorite).toBe(false)
    expect(nextDraft.routeClients[1]?.pinned).toBe(false)
  })
})
