import { useEffect, useState } from 'react'

import type { OptionsAssetsTab } from '../../platform/extension-api.js'
import { buildOptionsHashPath, buildOptionsSearch, getOptionsRouteFromLocation, normalizeOptionsLocation } from './routing.js'
import type { ClientDetailTab, EditableClientId, Section } from './types.js'

export function useOptionsRouting() {
  const initialRoute = getOptionsRouteFromLocation()
  const [section, setSection] = useState<Section>(initialRoute.section)
  const [assetTabHint, setAssetTabHint] = useState<OptionsAssetsTab | undefined>(initialRoute.assetTab)
  const [detailTabHint, setDetailTabHint] = useState<ClientDetailTab | undefined>(initialRoute.detailTab)
  const [selectedClientId, setSelectedClientId] = useState<EditableClientId | undefined>(initialRoute.clientId)
  const [clientDetailOpen, setClientDetailOpen] = useState(initialRoute.clientDetailOpen)
  const [selectedMarketEntryKey, setSelectedMarketEntryKey] = useState<string | undefined>(initialRoute.marketEntryKey)
  const [marketDetailOpen, setMarketDetailOpen] = useState(initialRoute.marketDetailOpen)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialRoute.sidebarCollapsed)

  useEffect(() => {
    const normalizedRoute = normalizeOptionsLocation()
    setSection(normalizedRoute.section)
    setAssetTabHint(normalizedRoute.assetTab)
    setDetailTabHint(normalizedRoute.detailTab)
    setClientDetailOpen(normalizedRoute.clientDetailOpen)
    setMarketDetailOpen(normalizedRoute.marketDetailOpen)
    setSidebarCollapsed(normalizedRoute.sidebarCollapsed)
    if (normalizedRoute.clientId) {
      setSelectedClientId(normalizedRoute.clientId)
    }
    if (normalizedRoute.marketEntryKey) {
      setSelectedMarketEntryKey(normalizedRoute.marketEntryKey)
    }

    const onLocationChange = () => {
      const nextRoute = getOptionsRouteFromLocation()
      setSection(nextRoute.section)
      setAssetTabHint(nextRoute.assetTab)
      setDetailTabHint(nextRoute.detailTab)
      setClientDetailOpen(nextRoute.clientDetailOpen)
      setMarketDetailOpen(nextRoute.marketDetailOpen)
      setSidebarCollapsed(nextRoute.sidebarCollapsed)
      if (nextRoute.clientId) {
        setSelectedClientId(nextRoute.clientId)
      }
      setSelectedMarketEntryKey(nextRoute.marketEntryKey)
    }

    window.addEventListener('hashchange', onLocationChange)
    window.addEventListener('popstate', onLocationChange)
    return () => {
      window.removeEventListener('hashchange', onLocationChange)
      window.removeEventListener('popstate', onLocationChange)
    }
  }, [])

  function setSectionAndHash(
    next: Section | 'assets',
    options?: {
      clientId?: EditableClientId
      assetTab?: OptionsAssetsTab
      detailTab?: ClientDetailTab
      clientDetailOpen?: boolean
      marketEntryKey?: string
      marketDetailOpen?: boolean
    }
  ) {
    const url = new URL(window.location.href)
    const normalizedSection = next === 'assets' ? 'clients' : next
    url.search = buildOptionsSearch(sidebarCollapsed)
    url.hash = buildOptionsHashPath(next, {
      clientId: options?.clientId,
      assetTab: options?.assetTab,
      detailTab: options?.detailTab,
      marketEntryKey: options?.marketEntryKey
    })
    window.history.replaceState(null, '', url)
    setSection(normalizedSection)
    setAssetTabHint(options?.assetTab)
    setDetailTabHint(options?.detailTab)
    setClientDetailOpen(Boolean(options?.clientDetailOpen || options?.clientId || options?.assetTab || options?.detailTab))
    setMarketDetailOpen(Boolean(options?.marketDetailOpen || options?.marketEntryKey))
    if (options?.clientId) {
      setSelectedClientId(options.clientId)
    }
    if (options?.marketEntryKey !== undefined) {
      setSelectedMarketEntryKey(options.marketEntryKey)
    }
  }

  function setSidebarCollapsedAndQuery(next: boolean) {
    const url = new URL(window.location.href)
    url.search = buildOptionsSearch(next)
    window.history.replaceState(null, '', url)
    setSidebarCollapsed(next)
  }

  return {
    section,
    assetTabHint,
    detailTabHint,
    selectedClientId,
    setSelectedClientId,
    clientDetailOpen,
    selectedMarketEntryKey,
    marketDetailOpen,
    sidebarCollapsed,
    setSectionAndHash,
    setSidebarCollapsedAndQuery
  }
}
