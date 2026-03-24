import { useEffect, useState } from 'react'

import type { OptionsAssetsTab } from '../extension-api.js'
import { buildOptionsHashPath, getOptionsRouteFromLocation, normalizeOptionsLocation } from './routing.js'
import type { EditableClientId, Section } from './types.js'

export function useOptionsRouting() {
  const initialRoute = getOptionsRouteFromLocation()
  const [section, setSection] = useState<Section>(initialRoute.section)
  const [assetTabHint, setAssetTabHint] = useState<OptionsAssetsTab | undefined>(initialRoute.assetTab)
  const [selectedClientId, setSelectedClientId] = useState<EditableClientId | undefined>(initialRoute.clientId)
  const [clientDetailOpen, setClientDetailOpen] = useState(initialRoute.clientDetailOpen)
  const [selectedMarketEntryKey, setSelectedMarketEntryKey] = useState<string | undefined>(initialRoute.marketEntryKey)
  const [marketDetailOpen, setMarketDetailOpen] = useState(initialRoute.marketDetailOpen)

  useEffect(() => {
    const normalizedRoute = normalizeOptionsLocation()
    setSection(normalizedRoute.section)
    setAssetTabHint(normalizedRoute.assetTab)
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
      marketEntryKey: options?.marketEntryKey
    })
    window.history.replaceState(null, '', url)
    setSection(normalizedSection)
    setAssetTabHint(options?.assetTab)
    setClientDetailOpen(Boolean(options?.clientDetailOpen || options?.clientId || options?.assetTab))
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
    selectedClientId,
    setSelectedClientId,
    clientDetailOpen,
    selectedMarketEntryKey,
    marketDetailOpen,
    setSectionAndHash
  }
}
