import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildOptionsHashPath, getOptionsRouteFromLocation } from '../src/ui/apps/options/routing.js'

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
})

function stubWindow(hash: string, search = '') {
  vi.stubGlobal('window', {
    location: {
      hash,
      search
    },
    history: {
      replaceState: vi.fn()
    }
  })
}
