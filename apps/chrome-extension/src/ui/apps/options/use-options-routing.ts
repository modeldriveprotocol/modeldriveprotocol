import { useEffect, useState } from 'react'

import type { OptionsAssetsTab } from '../../platform/extension-api.js'
import { buildOptionsHashPath, getOptionsRouteFromLocation, normalizeOptionsLocation } from './routing.js'
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

  useEffect(() => {
    const normalizedRoute = normalizeOptionsLocation()
    setSection(normalizedRoute.section)
    setAssetTabHint(normalizedRoute.assetTab)
    setDetailTabHint(normalizedRoute.detailTab)
    setClientDetailOpen(normalizedRoute.clientDetailOpen)
    setMarketDetailOpen(normalizedRoute.marketDetailOpen)
    if (normalizedRoute.clientId) {
      setSelectedClientId(normalizedRoute.clientId)
    }
    if (normalizedRoute.marketEntryKey) {
      setSelectedMarketEntryKey(normalizedRoute.marketEntryKey)
    }

    const onHashChange = () => {
      const nextRoute = getOptionsRouteFromLocation()
      setSection(nextRoute.section)
      setAssetTabHint(nextRoute.assetTab)
      setDetailTabHint(nextRoute.detailTab)
      setClientDetailOpen(nextRoute.clientDetailOpen)
      setMarketDetailOpen(nextRoute.marketDetailOpen)
      if (nextRoute.clientId) {
        setSelectedClientId(nextRoute.clientId)
      }
      setSelectedMarketEntryKey(nextRoute.marketEntryKey)
    }

    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
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
    url.search = ''
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

  return {
    section,
    assetTabHint,
    detailTabHint,
    selectedClientId,
    setSelectedClientId,
    clientDetailOpen,
    selectedMarketEntryKey,
    marketDetailOpen,
    setSectionAndHash
  }
}
