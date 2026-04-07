import AddCircleOutlineOutlined from '@mui/icons-material/AddCircleOutlineOutlined'
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined'
import FiberManualRecordOutlined from '@mui/icons-material/FiberManualRecordOutlined'
import HubOutlined from '@mui/icons-material/HubOutlined'
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined'
import WebOutlined from '@mui/icons-material/WebOutlined'
import { useEffect, useMemo, useState } from 'react'

import type { PopupClientState } from '#~/background/shared.js'
import {
  canCreateRouteClientFromUrl,
  matchesAnyPattern,
  matchesRouteClient
} from '#~/shared/config.js'

import {
  grantOrigin,
  injectBridge,
  loadWorkspaceConfig,
  openOptionsSection,
  refreshRuntime,
  requestRouteClientFromActiveTab,
  saveWorkspaceConfig,
  startRecording,
  startSelectorCapture,
  stopRecording
} from '../../platform/extension-api.js'
import { useI18n } from '../../i18n/provider.js'
import {
  countInstalledMarketClients,
  createInstalledMarketClient,
  fetchMarketCatalog,
  type MarketCatalogClientEntry,
  type MarketCatalogSourceData,
  type MarketCatalogSourceResult
} from '../../market/catalog.js'
import {
  toErrorMessage,
  getRouteClientPriority,
  resolveErrorRecoveryAction,
  routeClientNextStepLabel,
  routeClientStatusLabel,
  sidepanelFocusSummary,
  type SidepanelClientFilter
} from './helpers.js'
import type {
  RouteClientPrimaryActionDescriptor,
  SidepanelClientEntry,
  SidepanelContentMode,
  SidepanelController
} from './types.js'
import { useSidepanelRuntime } from './use-sidepanel-runtime.js'

export function useSidepanelController(): SidepanelController {
  const { t } = useI18n()
  const runtime = useSidepanelRuntime(t)
  const [selectedClientId, setSelectedClientId] = useState<string>()
  const [clientFilter, setClientFilter] = useState<SidepanelClientFilter>('all')
  const [clientSearch, setClientSearch] = useState('')
  const [contentMode, setContentMode] = useState<SidepanelContentMode>('clients')
  const [marketSearch, setMarketSearch] = useState('')
  const [marketCatalogs, setMarketCatalogs] = useState<MarketCatalogSourceResult[]>([])
  const [marketLoading, setMarketLoading] = useState(false)
  const [marketLoadError, setMarketLoadError] = useState<string>()
  const [marketRefreshKey, setMarketRefreshKey] = useState(0)

  const pageRouteClientItems = useMemo(() => {
    const routeClients = runtime.state?.clients.filter((client) => client.kind === 'route' && client.matchesActiveTab) ?? []
    return routeClients
      .map((client) => {
        const routeConfig = runtime.state?.config.routeClients.find((item) => item.id === client.id)
        const isRecording = runtime.state?.activeRecording?.routeClientId === client.id
        const isCapturingSelector = runtime.state?.pendingSelectorCapture?.routeClientId === client.id
        const priority = getRouteClientPriority({
          hasPermission: Boolean(runtime.state?.activeTabHasPermission),
          hasBridge: Boolean(runtime.state?.bridgeState),
          hasFlows: Boolean(routeConfig?.recordings.length),
          hasResources: Boolean(routeConfig?.selectorResources.length),
          hasSkills: Boolean(routeConfig?.skillEntries.length),
          isRecording,
          isCapturingSelector
        })
        return { client, priority }
      })
      .sort((left, right) => left.priority - right.priority || left.client.clientName.localeCompare(right.client.clientName))
  }, [runtime.state])

  const pageRouteClients = useMemo(() => pageRouteClientItems.map((item) => item.client), [pageRouteClientItems])
  const backgroundClients = useMemo(
    () => runtime.state?.clients.filter((client) => client.kind === 'background') ?? [],
    [runtime.state?.clients]
  )
  const selectedClient = useMemo(() => pageRouteClients.find((client) => client.id === selectedClientId) ?? pageRouteClients[0], [pageRouteClients, selectedClientId])
  const selectedRouteConfig = useMemo(() => runtime.state?.config.routeClients.find((client) => client.id === selectedClient?.id), [runtime.state?.config.routeClients, selectedClient?.id])
  const activeTabHasPermission = Boolean(runtime.state?.activeTabHasPermission)
  const canCreateFromActivePage = canCreateRouteClientFromUrl(runtime.state?.activeTab?.url)
  const marketSources = runtime.state?.config.marketSources ?? []
  const marketSourceKey = useMemo(
    () => marketSources.map((source) => `${source.id}:${source.url}`).join('|'),
    [marketSources]
  )

  const filteredSidepanelClients = useMemo(() => {
    const items: SidepanelClientEntry[] = []
    for (const backgroundClient of backgroundClients) {
      items.push({
        client: backgroundClient,
        listId: backgroundClient.id ?? backgroundClient.clientKey,
        priority: -1,
        type: 'background',
        searchText: [backgroundClient.clientName, backgroundClient.clientId, t('popup.backgroundClientSummary')].join(' ').toLowerCase()
      })
    }
    for (const item of pageRouteClientItems) {
      items.push({
        client: item.client,
        listId: item.client.id ?? item.client.clientKey,
        priority: item.priority,
        type: 'route',
        searchText: [item.client.clientName, item.client.clientId, item.client.routeRuleSummary ?? '', item.client.matchPatterns.join(' ')].join(' ').toLowerCase()
      })
    }

    const normalizedSearch = clientSearch.trim().toLowerCase()
    return items.filter((item) => {
      if (clientFilter !== 'all' && item.type !== clientFilter) {
        return false
      }
      return !normalizedSearch || item.searchText.includes(normalizedSearch)
    })
  }, [backgroundClients, clientFilter, clientSearch, pageRouteClientItems, t])

  const relatedRouteClients = useMemo(() => {
    if (!runtime.state?.activeTab?.url) {
      return []
    }
    const matchedIds = new Set(pageRouteClients.map((client) => client.id))
    return runtime.state.config.routeClients.filter((client) => {
      if (!client.enabled || matchedIds.has(client.id)) {
        return false
      }
      return matchesAnyPattern(runtime.state?.activeTab?.url, client.matchPatterns)
    })
  }, [pageRouteClients, runtime.state])

  const marketEntries = useMemo(() => {
    const keyword = marketSearch.trim().toLowerCase()
    const activeUrl = runtime.state?.activeTab?.url
    const routeClients = runtime.state?.config.routeClients ?? []

    return marketCatalogs
      .flatMap((catalog) =>
        catalog.clients
          .filter((entry) => matchesRouteClient(activeUrl, entry.template))
          .map((entry) => {
            const localCount = countInstalledMarketClients(routeClients, catalog.source.url, entry.id)
            const searchText = [
              entry.title,
              entry.summary,
              entry.template.clientName,
              entry.template.clientDescription,
              catalog.title,
              catalog.source.url,
              ...entry.tags
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
            return {
              key: `${catalog.source.id}:${entry.id}`,
              catalog,
              entry,
              localCount,
              searchText
            }
          })
      )
      .filter((item) => !keyword || item.searchText.includes(keyword))
      .sort((left, right) => {
        const sourceCompare = left.catalog.title.localeCompare(right.catalog.title)
        if (sourceCompare !== 0) {
          return sourceCompare
        }
        return left.entry.title.localeCompare(right.entry.title)
      })
  }, [marketCatalogs, marketSearch, runtime.state?.activeTab?.url, runtime.state?.config.routeClients])

  const marketMatchedSourceCount = useMemo(
    () => new Set(marketEntries.map((item) => item.catalog.source.id)).size,
    [marketEntries]
  )

  useEffect(() => {
    const preferredClientId = pageRouteClients[0]?.id
    if (!selectedClientId || !pageRouteClients.some((client) => client.id === selectedClientId)) {
      setSelectedClientId(preferredClientId)
    }
  }, [pageRouteClients, selectedClientId])

  useEffect(() => {
    if (contentMode !== 'market') {
      return
    }

    let cancelled = false

    async function loadMarketCatalogs() {
      if (marketSources.length === 0) {
        setMarketCatalogs([])
        setMarketLoading(false)
        setMarketLoadError(undefined)
        return
      }

      setMarketLoading(true)
      setMarketLoadError(undefined)

      try {
        const nextCatalogs = await Promise.all(marketSources.map((source) => fetchMarketCatalog(source)))
        if (!cancelled) {
          setMarketCatalogs(nextCatalogs)
        }
      } catch (nextError) {
        if (!cancelled) {
          setMarketCatalogs([])
          setMarketLoadError(toErrorMessage(nextError))
        }
      } finally {
        if (!cancelled) {
          setMarketLoading(false)
        }
      }
    }

    void loadMarketCatalogs()

    return () => {
      cancelled = true
    }
  }, [contentMode, marketRefreshKey, marketSourceKey])

  const buildRouteClientPrimaryAction = (client: PopupClientState): RouteClientPrimaryActionDescriptor => {
    const routeConfig = runtime.state?.config.routeClients.find((item) => item.id === client.id)
    const isRecordingClient = runtime.state?.activeRecording?.routeClientId === client.id
    const isCapturingSelector = runtime.state?.pendingSelectorCapture?.routeClientId === client.id

    if (isRecordingClient) {
      return {
        kind: 'stop',
        label: t('popup.stopRecording'),
        icon: <FiberManualRecordOutlined fontSize="small" />,
        onClick: () => void runtime.runAction(t('popup.recordingSaved'), async () => {
          await stopRecording(runtime.recordingName.trim(), runtime.recordingDescription.trim())
          runtime.setRecordingName('')
          runtime.setRecordingDescription('')
        }, { suggestSelectedClientPrimary: true })
      }
    }
    if (!activeTabHasPermission) {
      return {
        kind: 'grant',
        label: t('popup.grantAccess'),
        icon: <WebOutlined fontSize="small" />,
        onClick: () => void runtime.runAction(t('popup.permissionGranted'), async () => {
          await grantOrigin(client.id, runtime.state?.activeOriginPattern)
        }, { suggestSelectedClientPrimary: true })
      }
    }
    if (!runtime.state?.bridgeState && !isCapturingSelector) {
      return {
        kind: 'inject',
        label: t('popup.injectBridge'),
        icon: <HubOutlined fontSize="small" />,
        onClick: () => void runtime.runAction(t('popup.bridgeInjected'), async () => {
          await injectBridge(client.id)
        }, { suggestSelectedClientPrimary: true })
      }
    }
    if (!routeConfig?.recordings.length) {
      return { kind: 'record', label: t('popup.recordFlow'), icon: <FiberManualRecordOutlined fontSize="small" />, onClick: () => void runtime.runAction(t('popup.recordingStarted'), async () => startRecording(client.id)) }
    }
    if (!routeConfig.selectorResources.length) {
      return { kind: 'capture', label: t('popup.captureResource'), icon: <InsertDriveFileOutlined fontSize="small" />, onClick: () => void runtime.runAction(t('popup.selectorCaptureArmed'), async () => startSelectorCapture(client.id)) }
    }
    if (!routeConfig.skillEntries.length) {
      return { kind: 'skill', label: t('popup.addSkill'), icon: <AutoAwesomeOutlined fontSize="small" />, onClick: () => void openOptionsSection('assets', { clientId: client.id, assetTab: 'skills' }) }
    }
    return { kind: 'assets', label: t('popup.openAssets'), icon: <AutoAwesomeOutlined fontSize="small" />, onClick: () => void openOptionsSection('assets', { clientId: client.id, assetTab: 'flows' }) }
  }

  const sidepanelPrimaryAction = selectedClient?.id
    ? buildRouteClientPrimaryAction(selectedClient)
    : {
        label: canCreateFromActivePage ? t('popup.createClientFromPage') : t('popup.unsupportedActivePage'),
        icon: <AddCircleOutlineOutlined fontSize="small" />,
        disabled: !canCreateFromActivePage,
        onClick: () => void runtime.runAction(t('popup.routePresetCreated'), async () => { await requestRouteClientFromActiveTab() }, { suggestSelectedClientPrimary: true })
      }

  const errorRecoveryType = resolveErrorRecoveryAction({
    error: runtime.error,
    hasSelectedClient: Boolean(selectedClient?.id),
    canCreateFromActivePage
  })

  const errorRecoveryAction =
    errorRecoveryType === 'grant' && selectedClient?.id
      ? { label: t('popup.errorRecovery.grant'), onClick: () => void runtime.runAction(t('popup.permissionGranted'), async () => grantOrigin(selectedClient.id, runtime.state?.activeOriginPattern), { suggestSelectedClientPrimary: true }) }
      : errorRecoveryType === 'create'
        ? { label: t('popup.errorRecovery.create'), onClick: () => void runtime.runAction(t('popup.routePresetCreated'), async () => { await requestRouteClientFromActiveTab() }, { suggestSelectedClientPrimary: true }) }
        : undefined

  async function installMarketClient(catalog: MarketCatalogSourceData, entry: MarketCatalogClientEntry) {
    const currentConfig = await loadWorkspaceConfig()
    const existingCount = countInstalledMarketClients(currentConfig.routeClients, catalog.source.url, entry.id)
    const nextClient = createInstalledMarketClient({
      catalog,
      entry,
      existingCount
    })
    const requestedOrigins = [...new Set(nextClient.matchPatterns)]

    if (requestedOrigins.length > 0) {
      const granted = await chrome.permissions.request({ origins: requestedOrigins })
      if (!granted) {
        throw new Error(t('popup.market.installAccessDenied'))
      }
    }

    await saveWorkspaceConfig({
      ...currentConfig,
      routeClients: [nextClient, ...currentConfig.routeClients]
    })
    await refreshRuntime()

    setContentMode('clients')
    setClientFilter('route')
    setClientSearch('')
    setSelectedClientId(nextClient.id)
  }

  const sidepanelFocusText =
    contentMode === 'market'
      ? marketLoading
        ? t('popup.market.focus.loading')
        : marketSources.length === 0
          ? t('popup.market.focus.emptySources')
          : !runtime.state?.activeTab?.eligible
            ? t('popup.market.focus.unsupported')
            : marketEntries.length > 0
              ? t('popup.market.focus.matches', {
                  count: marketEntries.length,
                  sources: marketMatchedSourceCount
                })
              : t('popup.market.focus.emptyMatches')
      : sidepanelFocusSummary({
          clientName: selectedClient?.clientName,
          hasClient: Boolean(selectedClient?.id),
          canCreateFromActivePage,
          hasPermission: activeTabHasPermission,
          hasFlows: Boolean(selectedRouteConfig?.recordings.length),
          hasResources: Boolean(selectedRouteConfig?.selectorResources.length),
          hasSkills: Boolean(selectedRouteConfig?.skillEntries.length),
          isRecording: Boolean(runtime.state?.activeRecording && selectedClient?.id),
          isCapturingSelector: runtime.state?.pendingSelectorCapture?.routeClientId === selectedClient?.id,
          t
        })

  return {
    ...runtime,
    t,
    backgroundClients,
    pageRouteClients,
    filteredSidepanelClients,
    contentMode,
    setContentMode,
    relatedRouteClients,
    marketCatalogs,
    marketEntries,
    marketLoading,
    marketLoadError,
    marketSearch,
    setMarketSearch,
    refreshMarketCatalogs: () => setMarketRefreshKey((value) => value + 1),
    installMarketClient,
    selectedClient,
    selectedRouteConfig,
    activeTabHasPermission,
    canCreateFromActivePage,
    clientFilter,
    setClientFilter,
    clientSearch,
    setClientSearch,
    setSelectedClientId,
    sidepanelPrimaryAction,
    sidepanelFocusText,
    errorRecoveryAction,
    successFollowUpAction: runtime.flash?.suggestSelectedClientPrimary && selectedClient?.id ? buildRouteClientPrimaryAction(selectedClient) : undefined,
    buildRouteClientPrimaryAction
  }
}
