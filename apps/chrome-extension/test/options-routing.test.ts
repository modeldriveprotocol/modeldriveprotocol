import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildOptionsHashPath, buildOptionsSearch, getOptionsRouteFromLocation, normalizeOptionsLocation } from '../src/ui/apps/options/routing.js'

describe('options routing', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds activity routes for client detail tabs', () => {
    expect(
      buildOptionsHashPath('clients', {
        clientId: 'route-client-1',
        detailTab: 'activity'
      })
    ).toBe('#/clients/route-client-1/activity')
  })

  it('parses activity routes from the location hash', () => {
    stubWindow('#/clients/route-client-1/activity')

    expect(getOptionsRouteFromLocation()).toMatchObject({
      section: 'clients',
      clientId: 'route-client-1',
      detailTab: 'activity',
      clientDetailOpen: true
    })
  })

  it('keeps asset routes compatible with asset tab deep links', () => {
    stubWindow('#/clients/route-client-1/assets/skills')

    expect(getOptionsRouteFromLocation()).toMatchObject({
      section: 'clients',
      clientId: 'route-client-1',
      detailTab: 'assets',
      assetTab: 'skills',
      clientDetailOpen: true
    })
  })

  it('parses collapsed sidebar state from query params', () => {
    stubWindow('#/workspace', '?sidebar=collapsed')

    expect(getOptionsRouteFromLocation()).toMatchObject({
      section: 'workspace',
      sidebarCollapsed: true
    })
  })

  it('normalizes legacy search params while preserving sidebar query state', () => {
    const replaceState = vi.fn()
    stubWindow('', '?sidebar=collapsed&clientId=route-client-1&assetTab=skills', replaceState)

    expect(normalizeOptionsLocation()).toMatchObject({
      section: 'clients',
      clientId: 'route-client-1',
      assetTab: 'skills',
      detailTab: 'assets',
      sidebarCollapsed: true
    })
    expect(buildOptionsSearch(true)).toBe('?sidebar=collapsed')
    expect(replaceState).toHaveBeenCalledTimes(1)

    const [, , nextUrl] = replaceState.mock.calls[0] as [unknown, unknown, URL]
    expect(nextUrl.search).toBe('?sidebar=collapsed')
    expect(nextUrl.hash).toBe('#/clients/route-client-1/assets/skills')
  })
})

function stubWindow(hash: string, search = '', replaceState = vi.fn()) {
  const href = `https://example.test/options.html${search}${hash}`
  vi.stubGlobal('window', {
    location: {
      href,
      hash,
      search
    },
    history: {
      replaceState
    }
  })
}
