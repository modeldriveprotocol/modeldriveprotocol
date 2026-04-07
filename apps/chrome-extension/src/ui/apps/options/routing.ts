import type { OptionsAssetsTab } from '../../platform/extension-api.js'
import type { ClientDetailTab, EditableClientId, OptionsRouteState, Section } from './types.js'
import { SECTION_IDS } from './types.js'

const SIDEBAR_QUERY_KEY = 'sidebar'
const SIDEBAR_COLLAPSED_VALUE = 'collapsed'
const ASSET_PATH_QUERY_KEY = 'assetPath'

export function isOptionsAssetsTab(value: string | null | undefined): value is OptionsAssetsTab {
  return value === 'flows' || value === 'resources' || value === 'skills'
}

function isClientDetailTab(value: string | null | undefined): value is Exclude<ClientDetailTab, 'assets'> {
  return value === 'basics' || value === 'matching' || value === 'runtime' || value === 'activity'
}

export function isSidebarCollapsedFromSearch(search: string): boolean {
  const searchParams = new URLSearchParams(search)
  return searchParams.get(SIDEBAR_QUERY_KEY) === SIDEBAR_COLLAPSED_VALUE
}

export function buildOptionsSearch(
  sidebarCollapsed: boolean,
  options?: {
    assetPath?: string
  }
): string {
  const searchParams = new URLSearchParams()

  if (sidebarCollapsed) {
    searchParams.set(SIDEBAR_QUERY_KEY, SIDEBAR_COLLAPSED_VALUE)
  }

  if (options?.assetPath) {
    searchParams.set(ASSET_PATH_QUERY_KEY, options.assetPath)
  }

  const nextSearch = searchParams.toString()
  return nextSearch ? `?${nextSearch}` : ''
}

export function buildOptionsHashPath(
  section: Section | 'assets',
  options?: {
    assetTab?: OptionsAssetsTab
    clientId?: EditableClientId
    detailTab?: ClientDetailTab
    marketEntryKey?: string
  }
): string {
  const normalizedSection = section === 'assets' ? 'clients' : section

  if (normalizedSection === 'clients' && options?.clientId) {
    const segments = ['clients', encodeURIComponent(options.clientId)]

    if (options.detailTab === 'assets') {
      segments.push('assets')
      if (options.assetTab) {
        segments.push(options.assetTab)
      }
    } else if (options.detailTab) {
      segments.push(options.detailTab)
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
  const assetPath = searchParams.get(ASSET_PATH_QUERY_KEY) ?? undefined
  const sidebarCollapsed = isSidebarCollapsedFromSearch(window.location.search)
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
  let detailTab: ClientDetailTab | undefined
  let marketEntryKey: string | undefined

  if (segments[0] === 'assets') {
    section = 'clients'
    clientId = searchClientId
    assetTab = isOptionsAssetsTab(searchAssetTab) ? searchAssetTab : undefined
    detailTab = assetTab ? 'assets' : undefined
  } else if (SECTION_IDS.includes(segments[0] as Section)) {
    section = segments[0] as Section
    if (section === 'clients') {
      clientId = segments[1] as EditableClientId | undefined
      if (segments[2] === 'assets') {
        detailTab = 'assets'
        if (isOptionsAssetsTab(segments[3])) {
          assetTab = segments[3]
        }
      } else if (isClientDetailTab(segments[2])) {
        detailTab = segments[2]
      }
    } else if (section === 'market') {
      marketEntryKey = segments[1]
    }
  } else {
    section = searchClientId || isOptionsAssetsTab(searchAssetTab) ? 'clients' : 'workspace'
    clientId = searchClientId
    assetTab = isOptionsAssetsTab(searchAssetTab) ? searchAssetTab : undefined
    detailTab = assetTab ? 'assets' : undefined
  }

  if (!clientId && searchClientId && section === 'clients') {
    clientId = searchClientId
  }
  if (!assetTab && isOptionsAssetsTab(searchAssetTab) && section === 'clients') {
    assetTab = searchAssetTab
    detailTab = 'assets'
  }

  return {
    section,
    clientId,
    assetTab,
    assetPath,
    detailTab,
    marketEntryKey,
    clientDetailOpen: Boolean(clientId || assetTab || detailTab),
    marketDetailOpen: Boolean(section === 'market' && marketEntryKey),
    sidebarCollapsed
  }
}

export function normalizeOptionsLocation(): OptionsRouteState {
  const route = getOptionsRouteFromLocation()
  const nextHash = buildOptionsHashPath(route.section, {
    clientId: route.clientId,
    assetTab: route.assetTab,
    detailTab: route.detailTab
  })
  const nextSearch = buildOptionsSearch(route.sidebarCollapsed, {
    assetPath: route.assetPath
  })
  const hasLegacySearch = window.location.search !== nextSearch

  if (window.location.hash !== nextHash || hasLegacySearch) {
    const url = new URL(window.location.href)
    url.search = nextSearch
    url.hash = nextHash
    window.history.replaceState(null, '', url)
  }

  return route
}
