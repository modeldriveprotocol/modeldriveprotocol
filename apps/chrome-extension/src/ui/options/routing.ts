import type { OptionsAssetsTab } from '../extension-api.js'
import type { EditableClientId, OptionsRouteState, Section } from './types.js'
import { SECTION_IDS } from './types.js'

export function isOptionsAssetsTab(value: string | null | undefined): value is OptionsAssetsTab {
  return value === 'flows' || value === 'resources' || value === 'skills'
}

export function buildOptionsHashPath(
  section: Section | 'assets',
  options?: {
    assetTab?: OptionsAssetsTab
    clientId?: EditableClientId
    marketEntryKey?: string
  }
): string {
  const normalizedSection = section === 'assets' ? 'clients' : section

  if (normalizedSection === 'clients' && options?.clientId) {
    const segments = ['clients', encodeURIComponent(options.clientId)]
    if (options.assetTab) {
      segments.push('assets', options.assetTab)
    }
    return `#/${segments.join('/')}`
  }

  if (normalizedSection === 'market' && options?.marketEntryKey) {
    return `#/market/${encodeURIComponent(options.marketEntryKey)}`
  }

  return `#/${normalizedSection}`
}

export function getOptionsRouteFromLocation(): OptionsRouteState {
  const searchParams = new URLSearchParams(window.location.search)
  const searchClientId = searchParams.get('clientId') ?? undefined
  const searchAssetTab = searchParams.get('assetTab')
  const rawHash = window.location.hash.replace(/^#/, '')
  const hashPath = rawHash.startsWith('/') ? rawHash : `/${rawHash}`
  const segments = hashPath
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment)
      } catch {
        return segment
      }
    })

  let section: Section = 'workspace'
  let clientId: EditableClientId | undefined
  let assetTab: OptionsAssetsTab | undefined
  let marketEntryKey: string | undefined

  if (segments[0] === 'assets') {
    section = 'clients'
    clientId = searchClientId
    assetTab = isOptionsAssetsTab(searchAssetTab) ? searchAssetTab : undefined
  } else if (SECTION_IDS.includes(segments[0] as Section)) {
    section = segments[0] as Section
    if (section === 'clients') {
      clientId = segments[1] as EditableClientId | undefined
      if (segments[2] === 'assets' && isOptionsAssetsTab(segments[3])) {
        assetTab = segments[3]
      }
    } else if (section === 'market') {
      marketEntryKey = segments[1]
    }
  } else {
    section = searchClientId || isOptionsAssetsTab(searchAssetTab) ? 'clients' : 'workspace'
    clientId = searchClientId
    assetTab = isOptionsAssetsTab(searchAssetTab) ? searchAssetTab : undefined
  }

  if (!clientId && searchClientId && section === 'clients') {
    clientId = searchClientId
  }
  if (!assetTab && isOptionsAssetsTab(searchAssetTab) && section === 'clients') {
    assetTab = searchAssetTab
  }

  return {
    section,
    clientId,
    assetTab,
    marketEntryKey,
    clientDetailOpen: Boolean(clientId || assetTab),
    marketDetailOpen: Boolean(section === 'market' && marketEntryKey)
  }
}

export function normalizeOptionsLocation(): OptionsRouteState {
  const route = getOptionsRouteFromLocation()
  const nextHash = buildOptionsHashPath(route.section, {
    clientId: route.clientId,
    assetTab: route.assetTab
  })
  const hasLegacySearch = new URLSearchParams(window.location.search).size > 0

  if (window.location.hash !== nextHash || hasLegacySearch) {
    const url = new URL(window.location.href)
    url.search = ''
    url.hash = nextHash
    window.history.replaceState(null, '', url)
  }

  return route
}
