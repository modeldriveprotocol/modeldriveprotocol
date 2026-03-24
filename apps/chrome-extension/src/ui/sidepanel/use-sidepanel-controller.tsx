import AddCircleOutlineOutlined from '@mui/icons-material/AddCircleOutlineOutlined'
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined'
import FiberManualRecordOutlined from '@mui/icons-material/FiberManualRecordOutlined'
import HubOutlined from '@mui/icons-material/HubOutlined'
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined'
import WebOutlined from '@mui/icons-material/WebOutlined'
import { useEffect, useMemo, useState } from 'react'

import type { PopupClientState } from '#~/background/shared.js'
import { canCreateRouteClientFromUrl, matchesAnyPattern } from '#~/shared/config.js'

import {
  grantOrigin,
  injectBridge,
  openOptionsSection,
  requestRouteClientFromActiveTab,
  startRecording,
  startSelectorCapture,
  stopRecording
} from '../extension-api.js'
import { useI18n } from '../i18n.js'
import {
  getRouteClientPriority,
  resolveErrorRecoveryAction,
  routeClientNextStepLabel,
  routeClientStatusLabel,
  sidepanelFocusSummary,
  connectionStateLabel,
  type SidepanelClientFilter
} from './helpers.js'
import type {
  RouteClientPrimaryActionDescriptor,
  SidepanelClientEntry,
  SidepanelController
} from './types.js'
import { useSidepanelRuntime } from './use-sidepanel-runtime.js'

const BACKGROUND_SELECTION_ID = 'background'

export function useSidepanelController(): SidepanelController {
  const { t } = useI18n()
  const runtime = useSidepanelRuntime(t)
  const [selectedClientId, setSelectedClientId] = useState<string>()
  const [expandedClientKey, setExpandedClientKey] = useState<string>()
  const [clientFilter, setClientFilter] = useState<SidepanelClientFilter>('all')
  const [clientSearch, setClientSearch] = useState('')

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
  const backgroundClient = useMemo(() => runtime.state?.clients.find((client) => client.kind === 'background'), [runtime.state?.clients])
  const selectedClient = useMemo(() => pageRouteClients.find((client) => client.id === selectedClientId) ?? pageRouteClients[0], [pageRouteClients, selectedClientId])
  const selectedRouteConfig = useMemo(() => runtime.state?.config.routeClients.find((client) => client.id === selectedClient?.id), [runtime.state?.config.routeClients, selectedClient?.id])
  const activeTabHasPermission = Boolean(runtime.state?.activeTabHasPermission)
  const canCreateFromActivePage = canCreateRouteClientFromUrl(runtime.state?.activeTab?.url)

  const filteredSidepanelClients = useMemo(() => {
    const items: SidepanelClientEntry[] = []
    if (backgroundClient) {
      items.push({
        client: backgroundClient,
        listId: BACKGROUND_SELECTION_ID,
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
  }, [backgroundClient, clientFilter, clientSearch, pageRouteClientItems, t])

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

  useEffect(() => {
    const preferredClientId = pageRouteClients[0]?.id
    if (!selectedClientId || !pageRouteClients.some((client) => client.id === selectedClientId)) {
      setSelectedClientId(preferredClientId)
    }
  }, [pageRouteClients, selectedClientId])

  useEffect(() => {
    if (!filteredSidepanelClients.length) {
      setExpandedClientKey(undefined)
      return
    }
    if (!expandedClientKey || !filteredSidepanelClients.some((item) => item.listId === expandedClientKey)) {
      setExpandedClientKey(filteredSidepanelClients[0].listId)
    }
  }, [expandedClientKey, filteredSidepanelClients])

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
        : errorRecoveryType === 'clients'
          ? { label: t('popup.errorRecovery.clients'), onClick: () => void openOptionsSection('clients', { clientId: selectedClient?.id }) }
          : undefined

  return {
    ...runtime,
    t,
    backgroundClient,
    pageRouteClients,
    filteredSidepanelClients,
    relatedRouteClients,
    selectedClient,
    selectedRouteConfig,
    selectedOptionsClientId: expandedClientKey === BACKGROUND_SELECTION_ID ? BACKGROUND_SELECTION_ID : selectedClient?.id,
    activeTabHasPermission,
    canCreateFromActivePage,
    clientFilter,
    setClientFilter,
    clientSearch,
    setClientSearch,
    expandedClientKey,
    setExpandedClientKey,
    setSelectedClientId,
    sidepanelPrimaryAction,
    sidepanelFocusText: sidepanelFocusSummary({
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
    }),
    errorRecoveryAction,
    successFollowUpAction: runtime.flash?.suggestSelectedClientPrimary && selectedClient?.id ? buildRouteClientPrimaryAction(selectedClient) : undefined,
    buildRouteClientPrimaryAction
  }
}
