import AddCircleOutlineOutlined from '@mui/icons-material/AddCircleOutlineOutlined'
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined'
import DownloadOutlined from '@mui/icons-material/DownloadOutlined'
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined'
import FiberManualRecordOutlined from '@mui/icons-material/FiberManualRecordOutlined'
import FolderOutlined from '@mui/icons-material/FolderOutlined'
import GridViewOutlined from '@mui/icons-material/GridViewOutlined'
import HubOutlined from '@mui/icons-material/HubOutlined'
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined'
import PlayArrowOutlined from '@mui/icons-material/PlayArrowOutlined'
import RefreshOutlined from '@mui/icons-material/RefreshOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined'
import StorageOutlined from '@mui/icons-material/StorageOutlined'
import SmartToyOutlined from '@mui/icons-material/SmartToyOutlined'
import ViewSidebarOutlined from '@mui/icons-material/ViewSidebarOutlined'
import WebOutlined from '@mui/icons-material/WebOutlined'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material'
import { type ReactNode, useEffect, useMemo, useState } from 'react'

import type { PopupClientState } from '#~/background/shared.js'
import { canCreateRouteClientFromUrl, matchesAnyPattern, summarizeRouteRules } from '#~/shared/config.js'
import { clearPendingSelectorCapture, getPopupState, grantOrigin, injectBridge, openOptionsSection, openSidePanel, refreshRuntime, requestRouteClientFromActiveTab, runRecording, startRecording, startSelectorCapture, stopRecording } from './extension-api.js'
import { renderClientIcon } from './client-icons.js'
import { useI18n } from './i18n.js'
import {
  abilitySummary,
  connectionStateLabel,
  type FlashState,
  getRouteClientPriority,
  resolveErrorRecoveryAction,
  routeClientNextStepLabel,
  routeClientStatusLabel,
  sidepanelFocusSummary,
  type SidepanelClientFilter,
  stateTone,
  toErrorMessage,
  type RouteClientPrimaryActionKind
} from './popup-app/helpers.js'

export function PopupApp({ surface = 'popup' }: { surface?: 'popup' | 'sidepanel' }) {
  const { t } = useI18n()
  const [state, setState] = useState<Awaited<ReturnType<typeof getPopupState>> | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [flash, setFlash] = useState<FlashState>()
  const [selectedClientId, setSelectedClientId] = useState<string>()
  const [expandedClientKey, setExpandedClientKey] = useState<string>()
  const [clientFilter, setClientFilter] = useState<SidepanelClientFilter>('all')
  const [clientSearch, setClientSearch] = useState('')
  const [recordingName, setRecordingName] = useState('')
  const [recordingDescription, setRecordingDescription] = useState('')
  const backgroundSelectionId = 'background'

  const pageRouteClientItems = useMemo(() => {
    const routeClients = state?.clients.filter((client) => client.kind === 'route' && client.matchesActiveTab) ?? []

    return routeClients
      .map((client) => {
        const routeConfig = state?.config.routeClients.find((item) => item.id === client.id)
        const isRecording = state?.activeRecording?.routeClientId === client.id
        const isCapturingSelector = state?.pendingSelectorCapture?.routeClientId === client.id
        const priority = getRouteClientPriority({
          hasPermission: Boolean(state?.activeTabHasPermission),
          hasBridge: Boolean(state?.bridgeState),
          hasFlows: Boolean(routeConfig?.recordings.length),
          hasResources: Boolean(routeConfig?.selectorResources.length),
          hasSkills: Boolean(routeConfig?.skillEntries.length),
          isRecording,
          isCapturingSelector
        })

        return {
          client,
          priority
        }
      })
      .sort((left, right) => {
        if (left.priority !== right.priority) {
          return left.priority - right.priority
        }

        return left.client.clientName.localeCompare(right.client.clientName)
      })
  }, [state])
  const pageRouteClients = useMemo(
    () => pageRouteClientItems.map((item) => item.client),
    [pageRouteClientItems]
  )
  const backgroundClient = useMemo(
    () => state?.clients.find((client) => client.kind === 'background'),
    [state?.clients]
  )
  const selectedClient = useMemo(
    () => pageRouteClients.find((client) => client.id === selectedClientId) ?? pageRouteClients[0],
    [pageRouteClients, selectedClientId]
  )
  const selectedOptionsClientId = expandedClientKey === backgroundSelectionId ? backgroundSelectionId : selectedClient?.id
  const sidepanelClients = useMemo(() => {
    const items: Array<{
      client: PopupClientState
      listId: string
      priority: number
      searchText: string
      type: SidepanelClientFilter
    }> = []

    if (backgroundClient) {
      items.push({
        client: backgroundClient,
        listId: backgroundSelectionId,
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
        searchText: [
          item.client.clientName,
          item.client.clientId,
          item.client.routeRuleSummary ?? '',
          item.client.matchPatterns.join(' ')
        ]
          .join(' ')
          .toLowerCase()
      })
    }

    return items
  }, [backgroundClient, pageRouteClientItems, t])
  const filteredSidepanelClients = useMemo(() => {
    const normalizedSearch = clientSearch.trim().toLowerCase()

    return sidepanelClients.filter((item) => {
      if (clientFilter !== 'all' && item.type !== clientFilter) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return item.searchText.includes(normalizedSearch)
    })
  }, [clientFilter, clientSearch, sidepanelClients])

  const selectedRouteConfig = useMemo(
    () => state?.config.routeClients.find((client) => client.id === selectedClient?.id),
    [selectedClient?.id, state?.config.routeClients]
  )
  const relatedRouteClients = useMemo(() => {
    if (!state?.activeTab?.url) {
      return []
    }

    const matchedIds = new Set(pageRouteClients.map((client) => client.id))

    return state.config.routeClients.filter((client) => {
      if (!client.enabled || matchedIds.has(client.id)) {
        return false
      }

      return matchesAnyPattern(state.activeTab?.url, client.matchPatterns)
    })
  }, [pageRouteClients, state?.activeTab?.url, state?.config.routeClients])
  const canCreateFromActivePage = canCreateRouteClientFromUrl(state?.activeTab?.url)
  const activeTabHasPermission = Boolean(state?.activeTabHasPermission)
  const preferredClientId = useMemo(() => {
    return pageRouteClients[0]?.id
  }, [pageRouteClients])

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (!selectedClientId || !pageRouteClients.some((client) => client.id === selectedClientId)) {
      setSelectedClientId(preferredClientId)
    }
  }, [pageRouteClients, preferredClientId, selectedClientId])

  useEffect(() => {
    if (!filteredSidepanelClients.length) {
      setExpandedClientKey(undefined)
      return
    }

    if (!expandedClientKey || !filteredSidepanelClients.some((item) => item.listId === expandedClientKey)) {
      setExpandedClientKey(filteredSidepanelClients[0].listId)
    }
  }, [expandedClientKey, filteredSidepanelClients])

  useEffect(() => {
    if (state?.activeRecording && !recordingName) {
      setRecordingName(t('popup.defaultRecordingName', { name: state.activeRecording.routeClientName }))
      setRecordingDescription(t('popup.defaultRecordingDescription'))
    }
  }, [recordingDescription, recordingName, state?.activeRecording, t])

  useEffect(() => {
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined

    const scheduleRefresh = () => {
      if (timeoutId !== undefined) {
        globalThis.clearTimeout(timeoutId)
      }

      timeoutId = globalThis.setTimeout(() => {
        void load(false)
      }, 120)
    }

    const onTabUpdated = (_tabId: number, changeInfo: { status?: string; url?: string }) => {
      if (changeInfo.status === 'complete' || changeInfo.url) {
        scheduleRefresh()
      }
    }

    const onStorageChanged = (_changes: Record<string, chrome.storage.StorageChange>, areaName: chrome.storage.AreaName) => {
      if (areaName === 'local') {
        scheduleRefresh()
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        scheduleRefresh()
      }
    }

    chrome.tabs.onActivated.addListener(scheduleRefresh)
    chrome.tabs.onUpdated.addListener(onTabUpdated)
    chrome.tabs.onRemoved.addListener(scheduleRefresh)
    chrome.windows.onFocusChanged.addListener(scheduleRefresh)
    chrome.storage.onChanged.addListener(onStorageChanged)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      if (timeoutId !== undefined) {
        globalThis.clearTimeout(timeoutId)
      }

      chrome.tabs.onActivated.removeListener(scheduleRefresh)
      chrome.tabs.onUpdated.removeListener(onTabUpdated)
      chrome.tabs.onRemoved.removeListener(scheduleRefresh)
      chrome.windows.onFocusChanged.removeListener(scheduleRefresh)
      chrome.storage.onChanged.removeListener(onStorageChanged)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  async function load(showLoading = true) {
    try {
      if (showLoading) {
        setLoading(true)
      }
      setError(undefined)
      const next = await getPopupState()
      setState(next)
    } catch (nextError) {
      setError(toErrorMessage(nextError))
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  async function runAction(
    label: string,
    action: () => Promise<void>,
    options?: {
      suggestSelectedClientPrimary?: boolean
    }
  ) {
    try {
      setError(undefined)
      setFlash(undefined)
      await action()
      setFlash({
        message: label,
        suggestSelectedClientPrimary: options?.suggestSelectedClientPrimary
      })
      await load()
    } catch (nextError) {
      setError(toErrorMessage(nextError))
    }
  }

  const errorRecoveryAction = (() => {
    const recoveryType = resolveErrorRecoveryAction({
      error,
      hasSelectedClient: Boolean(selectedClient?.id),
      canCreateFromActivePage
    })

    switch (recoveryType) {
      case 'grant':
        if (!selectedClient?.id) {
          return undefined
        }

        return {
          label: t('popup.errorRecovery.grant'),
          onClick: () =>
            void runAction(
              t('popup.permissionGranted'),
              async () => {
                await grantOrigin(selectedClient.id, state?.activeOriginPattern)
              },
              {
                suggestSelectedClientPrimary: true
              }
            )
        }

      case 'create':
        return {
          label: t('popup.errorRecovery.create'),
          onClick: () =>
            void runAction(
              t('popup.routePresetCreated'),
              async () => {
                await requestRouteClientFromActiveTab()
              },
              {
                suggestSelectedClientPrimary: true
              }
            )
        }

      case 'clients':
        return {
          label: t('popup.errorRecovery.clients'),
          onClick: () =>
            void openOptionsSection('clients', {
              clientId: selectedClient?.id
            })
        }

      default:
        return undefined
    }
  })()

  const sidepanelPrimaryAction = (() => {
    if (state?.activeRecording && selectedClient?.id) {
      return {
        label: t('popup.stopRecording'),
        icon: <FiberManualRecordOutlined fontSize="small" />,
        onClick: () =>
          void runAction(
            t('popup.recordingSaved'),
            async () => {
              await stopRecording(recordingName.trim(), recordingDescription.trim())
              setRecordingName('')
              setRecordingDescription('')
            },
            {
              suggestSelectedClientPrimary: true
            }
          )
      }
    }

    if (!selectedClient?.id) {
      return {
        label: canCreateFromActivePage ? t('popup.createClientFromPage') : t('popup.unsupportedActivePage'),
        icon: <AddCircleOutlineOutlined fontSize="small" />,
        disabled: !canCreateFromActivePage,
        onClick: () =>
          void runAction(
            t('popup.routePresetCreated'),
            async () => {
              await requestRouteClientFromActiveTab()
            },
            {
              suggestSelectedClientPrimary: true
            }
          )
      }
    }

    if (!activeTabHasPermission) {
      return {
        label: t('popup.grantAccess'),
        icon: <WebOutlined fontSize="small" />,
        onClick: () =>
          void runAction(
            t('popup.permissionGranted'),
            async () => {
              await grantOrigin(selectedClient.id, state?.activeOriginPattern)
            },
            {
              suggestSelectedClientPrimary: true
            }
          )
      }
    }

    if (!selectedRouteConfig?.recordings.length) {
      return {
        label: t('popup.recordFlow'),
        icon: <FiberManualRecordOutlined fontSize="small" />,
        onClick: () =>
          void runAction(t('popup.recordingStarted'), async () => {
            await startRecording(selectedClient.id)
          })
      }
    }

    if (!selectedRouteConfig.selectorResources.length) {
      return {
        label: t('popup.captureResource'),
        icon: <InsertDriveFileOutlined fontSize="small" />,
        onClick: () =>
          void runAction(t('popup.selectorCaptureArmed'), async () => {
            await startSelectorCapture(selectedClient.id)
          })
      }
    }

    if (!selectedRouteConfig.skillEntries.length) {
      return {
        label: t('popup.addSkill'),
        icon: <AutoAwesomeOutlined fontSize="small" />,
        onClick: () =>
          void openOptionsSection('assets', {
            clientId: selectedClient.id,
            assetTab: 'skills'
          })
      }
    }

    return {
      label: t('popup.openAssets'),
      icon: <AutoAwesomeOutlined fontSize="small" />,
      onClick: () =>
        void openOptionsSection('assets', {
          clientId: selectedClient.id,
          assetTab: 'flows'
        })
    }
  })()
  const sidepanelFocusText = sidepanelFocusSummary({
    clientName: selectedClient?.clientName,
    hasClient: Boolean(selectedClient?.id),
    canCreateFromActivePage,
    hasPermission: activeTabHasPermission,
    hasFlows: Boolean(selectedRouteConfig?.recordings.length),
    hasResources: Boolean(selectedRouteConfig?.selectorResources.length),
    hasSkills: Boolean(selectedRouteConfig?.skillEntries.length),
    isRecording: Boolean(state?.activeRecording && selectedClient?.id),
    isCapturingSelector: state?.pendingSelectorCapture?.routeClientId === selectedClient?.id,
    t
  })
  const buildRouteClientPrimaryAction = (client: PopupClientState): {
    kind: RouteClientPrimaryActionKind
    label: string
    icon: ReactNode
    onClick: () => void
  } => {
    const routeConfig = state?.config.routeClients.find((item) => item.id === client.id)
    const isRecordingClient = state?.activeRecording?.routeClientId === client.id
    const isCapturingSelector = state?.pendingSelectorCapture?.routeClientId === client.id

    if (isRecordingClient) {
      return {
        kind: 'stop' as const,
        label: t('popup.stopRecording'),
        icon: <FiberManualRecordOutlined fontSize="small" />,
        onClick: () =>
          void runAction(
            t('popup.recordingSaved'),
            async () => {
              await stopRecording(recordingName.trim(), recordingDescription.trim())
              setRecordingName('')
              setRecordingDescription('')
            },
            {
              suggestSelectedClientPrimary: true
            }
          )
      }
    }

    if (!activeTabHasPermission) {
      return {
        kind: 'grant' as const,
        label: t('popup.grantAccess'),
        icon: <WebOutlined fontSize="small" />,
        onClick: () =>
          void runAction(
            t('popup.permissionGranted'),
            async () => {
              await grantOrigin(client.id, state?.activeOriginPattern)
            },
            {
              suggestSelectedClientPrimary: true
            }
          )
      }
    }

    if (!state?.bridgeState && !isCapturingSelector) {
      return {
        kind: 'inject' as const,
        label: t('popup.injectBridge'),
        icon: <HubOutlined fontSize="small" />,
        onClick: () =>
          void runAction(
            t('popup.bridgeInjected'),
            async () => {
              await injectBridge(client.id)
            },
            {
              suggestSelectedClientPrimary: true
            }
          )
      }
    }

    if (!routeConfig?.recordings.length) {
      return {
        kind: 'record' as const,
        label: t('popup.recordFlow'),
        icon: <FiberManualRecordOutlined fontSize="small" />,
        onClick: () =>
          void runAction(t('popup.recordingStarted'), async () => {
            await startRecording(client.id)
          })
      }
    }

    if (!routeConfig.selectorResources.length) {
      return {
        kind: 'capture' as const,
        label: t('popup.captureResource'),
        icon: <InsertDriveFileOutlined fontSize="small" />,
        onClick: () =>
          void runAction(t('popup.selectorCaptureArmed'), async () => {
            await startSelectorCapture(client.id)
          })
      }
    }

    if (!routeConfig.skillEntries.length) {
      return {
        kind: 'skill' as const,
        label: t('popup.addSkill'),
        icon: <AutoAwesomeOutlined fontSize="small" />,
        onClick: () =>
          void openOptionsSection('assets', {
            clientId: client.id,
            assetTab: 'skills'
          })
      }
    }

    return {
      kind: 'assets' as const,
      label: t('popup.openAssets'),
      icon: <AutoAwesomeOutlined fontSize="small" />,
      onClick: () =>
        void openOptionsSection('assets', {
          clientId: client.id,
          assetTab: 'flows'
        })
    }
  }
  const successFollowUpAction =
    flash?.suggestSelectedClientPrimary && selectedClient?.id
      ? buildRouteClientPrimaryAction(selectedClient)
      : undefined

  const footer = surface === 'sidepanel' ? t('sidepanel.footer') : t('popup.footer')

  if (surface === 'sidepanel') {
    return (
      <Stack spacing={0} sx={{ minHeight: '100vh' }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: 1.5,
            py: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }}
        >
          <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1, minWidth: 0, pr: 1 }}>
            {t('popup.sidepanelSummary', {
              background: backgroundClient ? 1 : 0,
              page: pageRouteClients.length,
              online: state?.onlineClientCount ?? 0
            })}
          </Typography>
          <Stack direction="row" spacing={0.5}>
            <ActionIcon
              label={sidepanelPrimaryAction.label}
              onClick={sidepanelPrimaryAction.onClick}
              disabled={sidepanelPrimaryAction.disabled}
              emphasis
            >
              {sidepanelPrimaryAction.icon}
            </ActionIcon>
            <ActionIcon label={t('popup.importClient')} onClick={() => void openOptionsSection('settings')}>
              <DownloadOutlined fontSize="small" />
            </ActionIcon>
            <ActionIcon
              label={t('popup.openOptions')}
              onClick={() =>
                void openOptionsSection('clients', {
                  clientId: selectedOptionsClientId
                })
              }
            >
              <SettingsOutlined fontSize="small" />
            </ActionIcon>
            <ActionIcon label={t('popup.openMarket')} onClick={() => void openOptionsSection('market')}>
              <StorefrontOutlined fontSize="small" />
            </ActionIcon>
          </Stack>
        </Stack>

        <Box sx={{ px: 2, py: 0.75, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
          <Typography variant="body2" color="text.secondary" noWrap>
            {sidepanelFocusText}
          </Typography>
        </Box>

        <Stack spacing={1} sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              placeholder={t('popup.searchClients')}
              value={clientSearch}
              onChange={(event) => setClientSearch(event.target.value)}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined fontSize="small" />
                  </InputAdornment>
                )
              }}
            />
          </Stack>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={clientFilter}
            onChange={(_event, nextValue: SidepanelClientFilter | null) => {
              if (nextValue) {
                setClientFilter(nextValue)
              }
            }}
            sx={{ alignSelf: 'flex-start' }}
          >
            <ToggleButton value="all">{t('popup.filter.all')}</ToggleButton>
            <ToggleButton value="background">{t('popup.filter.background')}</ToggleButton>
            <ToggleButton value="route">{t('popup.filter.route')}</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {flash ? (
          <Alert
            severity="success"
            sx={{ borderRadius: 0 }}
            action={
              successFollowUpAction ? (
                <Button color="inherit" size="small" onClick={successFollowUpAction.onClick} startIcon={successFollowUpAction.icon}>
                  {successFollowUpAction.label}
                </Button>
              ) : undefined
            }
          >
            {flash.message}
          </Alert>
        ) : null}
        {error ? (
          <Alert
            severity="error"
            sx={{ borderRadius: 0 }}
            action={
              errorRecoveryAction ? (
                <Button color="inherit" size="small" onClick={errorRecoveryAction.onClick}>
                  {errorRecoveryAction.label}
                </Button>
              ) : undefined
            }
          >
            {error}
          </Alert>
        ) : null}
        {loading ? <Alert severity="info" sx={{ borderRadius: 0 }}>{t('common.loading')}</Alert> : null}

        <Stack spacing={1} sx={{ px: 2, py: 1 }}>
          {pageRouteClients.length === 0 ? (
            <Box sx={{ py: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                {canCreateFromActivePage ? t('popup.noMatchingClient') : t('popup.unsupportedActivePage')}
              </Typography>
              {!canCreateFromActivePage && relatedRouteClients.length === 0 ? (
                <Button size="small" variant="text" onClick={() => void openOptionsSection('clients')} sx={{ mt: 1, px: 0 }}>
                  {t('popup.errorRecovery.clients')}
                </Button>
              ) : null}
              {relatedRouteClients.length ? (
                <Stack spacing={1} sx={{ mt: 1.25 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('popup.relatedClientsTitle')}
                  </Typography>
                  <List dense disablePadding>
                    {relatedRouteClients.slice(0, 3).map((client) => (
                      <ListItem key={client.id} disablePadding sx={{ py: 0.5 }}>
                        <ListItemText
                          primary={client.clientName}
                          secondary={summarizeRouteRules(client)}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() =>
                      void openOptionsSection('clients', {
                        clientId: relatedRouteClients[0]?.id
                      })
                    }
                    sx={{ alignSelf: 'flex-start', px: 0 }}
                  >
                    {t('popup.relatedClientsAction')}
                  </Button>
                </Stack>
              ) : null}
            </Box>
          ) : null}

          {filteredSidepanelClients.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              {t('popup.noFilteredClients')}
            </Typography>
          ) : null}

          {filteredSidepanelClients.map((item) => {
              if (item.type === 'background') {
                return (
                  <Accordion
                    key={item.client.clientKey}
                    disableGutters
                    expanded={expandedClientKey === backgroundSelectionId}
                    onChange={(_event, expanded) => setExpandedClientKey(expanded ? backgroundSelectionId : undefined)}
                    sx={{
                      '&::before': { display: 'none' },
                      boxShadow: 'none',
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: '14px !important',
                      overflow: 'hidden'
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreOutlined fontSize="small" />} sx={{ px: 1.5, py: 0.5 }}>
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                          <Box
                            sx={{
                              width: 34,
                              height: 34,
                              borderRadius: '10px',
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: 'background.paper',
                              color: 'text.primary',
                              display: 'grid',
                              placeItems: 'center',
                              flexShrink: 0
                            }}
                          >
                            {renderClientIcon(item.client.icon)}
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" noWrap>
                              {item.client.clientName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {t('popup.backgroundClientSummary')}
                            </Typography>
                          </Box>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {connectionStateLabel(item.client.connectionState, t)}
                        </Typography>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 1.5, py: 1.25 }}>
                      <Stack spacing={1}>
                        <Typography variant="body2" color="text.secondary">
                          {item.client.clientDescription || t('popup.backgroundClientSummary')}
                        </Typography>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<SettingsOutlined fontSize="small" />}
                          onClick={() =>
                            void openOptionsSection('clients', {
                              clientId: backgroundSelectionId
                            })
                          }
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          {t('popup.errorRecovery.clients')}
                        </Button>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                )
              }

              const client = item.client
              const routeConfig = state?.config.routeClients.find((item) => item.id === client.id)
              const isRecordingClient = state?.activeRecording?.routeClientId === client.id
              const isCapturingSelector = state?.pendingSelectorCapture?.routeClientId === client.id
              const primaryAction = buildRouteClientPrimaryAction(client)
              const clientStatus = routeClientStatusLabel({
                client,
                hasPermission: activeTabHasPermission,
                hasBridge: Boolean(state?.bridgeState),
                hasFlows: Boolean(routeConfig?.recordings.length),
                isRecording: isRecordingClient,
                isCapturingSelector,
                t
              })
              const nextStep = routeClientNextStepLabel({
                hasPermission: activeTabHasPermission,
                hasFlows: Boolean(routeConfig?.recordings.length),
                hasResources: Boolean(routeConfig?.selectorResources.length),
                hasSkills: Boolean(routeConfig?.skillEntries.length),
                isRecording: isRecordingClient,
                isCapturingSelector,
                t
              })

              return (
                <Accordion
                  key={client.clientKey}
                  disableGutters
                  expanded={expandedClientKey === client.id}
                  onChange={(_event, expanded) => {
                    setExpandedClientKey(expanded ? client.id : undefined)
                    if (expanded) {
                      setSelectedClientId(client.id)
                    }
                  }}
                  sx={{
                    '&::before': { display: 'none' },
                    boxShadow: 'none',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '14px !important',
                    overflow: 'hidden'
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreOutlined fontSize="small" />}
                    sx={{ px: 1.5, py: 0.5 }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: '10px',
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                            color: 'text.primary',
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0
                          }}
                        >
                          {renderClientIcon(client.icon)}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle2" noWrap>
                            {client.clientName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {client.routeRuleSummary ?? client.matchPatterns[0] ?? t('popup.noRouteRules')}
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack spacing={0.25} sx={{ minWidth: 120, textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary">
                          {connectionStateLabel(client.connectionState, t)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {clientStatus}
                        </Typography>
                      </Stack>
                    </Stack>
                  </AccordionSummary>

                  <AccordionDetails sx={{ px: 1.5, py: 1.25 }}>
                    <Stack spacing={1.25}>
                      <Typography variant="caption" color="text.secondary">
                        {abilitySummary(client, t).join(' · ')}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
                        {nextStep}
                      </Typography>

                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={primaryAction.icon}
                          onClick={primaryAction.onClick}
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          {primaryAction.label}
                        </Button>
                        <Stack direction="row" spacing={0.5}>
                          {primaryAction.kind !== 'record' && primaryAction.kind !== 'stop' ? (
                            <ActionIcon
                              label={isRecordingClient ? t('popup.stopRecording') : t('popup.recordFlow')}
                              onClick={() =>
                                void runAction(
                                  isRecordingClient ? t('popup.recordingSaved') : t('popup.recordingStarted'),
                                  async () => {
                                    if (isRecordingClient) {
                                      await stopRecording(recordingName.trim(), recordingDescription.trim())
                                      setRecordingName('')
                                      setRecordingDescription('')
                                      return
                                    }

                                    await startRecording(client.id)
                                  },
                                  isRecordingClient
                                    ? {
                                        suggestSelectedClientPrimary: true
                                      }
                                    : undefined
                                )
                              }
                            >
                              <FiberManualRecordOutlined fontSize="small" color={isRecordingClient ? 'error' : 'inherit'} />
                            </ActionIcon>
                          ) : null}
                          {primaryAction.kind !== 'capture' ? (
                            <ActionIcon
                              label={t('popup.captureResource')}
                              onClick={() =>
                                void runAction(t('popup.selectorCaptureArmed'), async () => {
                                  await startSelectorCapture(client.id)
                                })
                              }
                            >
                              <InsertDriveFileOutlined fontSize="small" />
                            </ActionIcon>
                          ) : null}
                          {primaryAction.kind !== 'skill' && primaryAction.kind !== 'assets' ? (
                            <ActionIcon
                              label={t('popup.addSkill')}
                              onClick={() =>
                                void openOptionsSection('assets', {
                                  clientId: client.id,
                                  assetTab: 'skills'
                                })
                              }
                            >
                              <AutoAwesomeOutlined fontSize="small" />
                            </ActionIcon>
                          ) : null}
                          {primaryAction.kind !== 'inject' && primaryAction.kind !== 'grant' ? (
                            <ActionIcon
                              label={t('popup.injectBridge')}
                              onClick={() =>
                                void runAction(
                                  t('popup.bridgeInjected'),
                                  async () => {
                                    await injectBridge(client.id)
                                  },
                                  {
                                    suggestSelectedClientPrimary: true
                                  }
                                )
                              }
                            >
                              <HubOutlined fontSize="small" />
                            </ActionIcon>
                          ) : null}
                        </Stack>
                      </Stack>

                      {isRecordingClient ? (
                        <Stack direction="row" spacing={1}>
                          <TextField
                            size="small"
                            label={t('popup.flowName')}
                            value={recordingName}
                            onChange={(event) => setRecordingName(event.target.value)}
                            fullWidth
                          />
                          <TextField
                            size="small"
                            label={t('common.summary')}
                            value={recordingDescription}
                            onChange={(event) => setRecordingDescription(event.target.value)}
                            fullWidth
                          />
                        </Stack>
                      ) : null}

                      {isCapturingSelector ? (
                        <Alert
                          severity="success"
                          action={
                            <Tooltip title={t('popup.dismiss')}>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  void runAction(t('popup.selectorCaptureCleared'), async () => {
                                    await clearPendingSelectorCapture()
                                  })
                                }
                              >
                                <FolderOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          }
                        >
                          {t('popup.capturedSelector', { selector: state?.pendingSelectorCapture?.resource.selector ?? '' })}
                        </Alert>
                      ) : null}

                      {routeConfig?.recordings?.length ? (
                        <List dense disablePadding>
                          {routeConfig.recordings.slice(0, 3).map((recording) => (
                            <ListItem
                              key={recording.id}
                              disablePadding
                              secondaryAction={
                                <Tooltip title={t('popup.replayFlow')}>
                                  <IconButton
                                    edge="end"
                                    size="small"
                                    onClick={() =>
                                      void runAction(t('popup.replayedFlow'), async () => {
                                        if (!client.id) {
                                          return
                                        }
                                        await runRecording(client.id, recording.id)
                                      })
                                    }
                                  >
                                    <PlayArrowOutlined fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              }
                              sx={{ py: 0.25 }}
                            >
                              <ListItemText
                                primary={recording.name}
                                secondary={t('popup.flowSteps', { count: recording.steps.length })}
                                primaryTypographyProps={{ variant: 'body2' }}
                                secondaryTypographyProps={{ variant: 'caption' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {t('popup.noFlows')}
                        </Typography>
                      )}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              )
            })}
        </Stack>
      </Stack>
    )
  }

  const title = state?.activeTab?.title ?? t('popup.currentPageTitle')
  const subtitle = state?.activeTab?.url ?? t('popup.currentPageSubtitle')

  return (
    <Stack spacing={1.25}>
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '14px',
          px: 1.5,
          py: 1
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  display: 'grid',
                  placeItems: 'center'
                }}
              >
                <ViewSidebarOutlined fontSize="small" />
              </Box>
              {surface === 'popup' ? (
                <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800 }}>
                  {t('popup.pageControl')}
                </Typography>
              ) : null}
            </Stack>
            <Typography variant="h5" sx={{ lineHeight: 1.05 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {subtitle}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.5}>
            <ActionIcon label={t('popup.refresh')} onClick={() => runAction(t('popup.runtimeRefreshed'), refreshRuntime)}>
              <RefreshOutlined fontSize="small" />
            </ActionIcon>
            <ActionIcon label={t('popup.openImports')} onClick={() => void openOptionsSection('settings')}>
              <DownloadOutlined fontSize="small" />
            </ActionIcon>
            <ActionIcon label={t('popup.openMarket')} onClick={() => void openOptionsSection('market')}>
              <StorefrontOutlined fontSize="small" />
            </ActionIcon>
            {surface === 'popup' ? (
              <ActionIcon label={t('popup.openSidePanel')} onClick={() => runAction(t('popup.openSidePanel'), openSidePanel)}>
                <GridViewOutlined fontSize="small" />
              </ActionIcon>
            ) : null}
            <ActionIcon
              label={t('popup.openOptions')}
              onClick={() =>
                void openOptionsSection('clients', {
                  clientId: selectedClient?.id
                })
              }
            >
              <SettingsOutlined fontSize="small" />
            </ActionIcon>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={0.75} sx={{ mt: 1.25, flexWrap: 'wrap' }}>
          <Chip
            size="small"
            icon={<GridViewOutlined />}
            label={t('popup.pageClientsBadge', { count: pageRouteClients.length })}
            color={pageRouteClients.length > 0 ? 'success' : 'default'}
          />
          <Chip size="small" icon={<StorageOutlined />} label={t('popup.onlineClientsBadge', { count: state?.onlineClientCount ?? 0 })} />
          <Chip
            size="small"
            icon={<HubOutlined />}
            label={
              state?.bridgeState
                ? t('popup.bridgeToolsBadge', { count: state.bridgeState.tools.length })
                : t('popup.bridgeNotReady')
            }
            color={state?.bridgeState ? 'success' : 'warning'}
          />
        </Stack>
      </Paper>

      {flash ? (
        <Alert
          severity="success"
          action={
            successFollowUpAction ? (
              <Button color="inherit" size="small" onClick={successFollowUpAction.onClick} startIcon={successFollowUpAction.icon}>
                {successFollowUpAction.label}
              </Button>
            ) : undefined
          }
        >
          {flash.message}
        </Alert>
      ) : null}
      {error ? (
        <Alert
          severity="error"
          action={
            errorRecoveryAction ? (
              <Button color="inherit" size="small" onClick={errorRecoveryAction.onClick}>
                {errorRecoveryAction.label}
              </Button>
            ) : undefined
          }
        >
          {error}
        </Alert>
      ) : null}
      {loading ? <Alert severity="info">{t('common.loading')}</Alert> : null}

      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '14px',
          overflow: 'hidden'
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1.5, py: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <GridViewOutlined fontSize="small" color="primary" />
            <Box>
              <Typography variant="subtitle2">{t('popup.pageClientsTitle')}</Typography>
              {surface === 'popup' ? (
                <Typography variant="body2" color="text.secondary">
                  {t('popup.pageClientsDescription')}
                </Typography>
              ) : null}
            </Box>
          </Stack>
          <Stack direction="row" spacing={0.5}>
            <ActionIcon
              label={t('popup.createClientFromPage')}
              onClick={() =>
                runAction(
                  t('popup.routePresetCreated'),
                  async () => {
                    await requestRouteClientFromActiveTab()
                  },
                  {
                    suggestSelectedClientPrimary: true
                  }
                )
              }
            >
              <AddCircleOutlineOutlined fontSize="small" />
            </ActionIcon>
            <ActionIcon label={t('popup.importClient')} onClick={() => void openOptionsSection('settings')}>
              <DownloadOutlined fontSize="small" />
            </ActionIcon>
          </Stack>
        </Stack>
        <Divider />
        {pageRouteClients.length === 0 ? (
          <Box sx={{ px: 1.5, py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('popup.noMatchingClient')}
            </Typography>
          </Box>
        ) : (
          pageRouteClients.map((client) => {
            const routeConfig = state?.config.routeClients.find((item) => item.id === client.id)
            return (
              <Accordion
                key={client.clientKey}
                disableGutters
                elevation={0}
                expanded={selectedClient?.id === client.id}
                onChange={(_, expanded) => setSelectedClientId(expanded ? client.id : selectedClient?.id)}
                sx={{
                  '&::before': { display: 'none' },
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <AccordionSummary sx={{ px: 1.5, py: 0.5 }}>
                  <Stack direction="row" spacing={1.25} alignItems="center" width="100%">
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: '10px',
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        color: 'text.primary',
                        display: 'grid',
                        placeItems: 'center'
                      }}
                    >
                      {renderClientIcon(client.icon)}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap>
                        {client.clientName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {client.routeRuleSummary ?? client.matchPatterns[0] ?? t('popup.noRouteRules')}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <Chip
                        size="small"
                        icon={<WebOutlined />}
                        label={client.matchesActiveTab ? t('popup.clientMatched') : t('popup.clientAvailable')}
                        color={client.matchesActiveTab ? 'success' : 'default'}
                      />
                      <Chip
                        size="small"
                        icon={<StorageOutlined />}
                        label={connectionStateLabel(client.connectionState, t)}
                        color={stateTone(client.connectionState)}
                      />
                    </Stack>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 1.5, py: 1.25 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }}>
                      {abilitySummary(client, t).map((item) => (
                        <Chip key={item} size="small" variant="outlined" label={item} />
                      ))}
                    </Stack>
                    {routeConfig?.recordings?.length ? (
                      <List dense disablePadding>
                        {routeConfig.recordings.slice(0, 3).map((recording) => (
                          <ListItem
                            key={recording.id}
                            disablePadding
                            secondaryAction={
                              <Tooltip title={t('popup.replayFlow')}>
                                <IconButton
                                  edge="end"
                                  size="small"
                                  onClick={() =>
                                    void runAction(t('popup.replayedFlow'), async () => {
                                      if (!client.id) {
                                        return
                                      }
                                      await runRecording(client.id, recording.id)
                                    })
                                  }
                                >
                                  <PlayArrowOutlined fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            }
                            sx={{ py: 0.25 }}
                          >
                            <ListItemText
                              primary={recording.name}
                              secondary={t('popup.flowSteps', { count: recording.steps.length })}
                              primaryTypographyProps={{ variant: 'body2' }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {t('popup.noFlows')}
                      </Typography>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )
          })
        )}
      </Paper>

      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '14px',
          px: 1.5,
          py: 1.25
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <SmartToyOutlined fontSize="small" color="primary" />
            <Box>
              <Typography variant="subtitle2">{t('popup.quickCreateTitle')}</Typography>
              {surface === 'popup' ? (
                <Typography variant="body2" color="text.secondary">
                  {t('popup.quickCreateDescription')}
                </Typography>
              ) : null}
            </Box>
          </Stack>
          <Stack direction="row" spacing={0.5}>
            <ActionIcon
              label={state?.activeRecording ? t('popup.stopRecording') : t('popup.recordFlow')}
              disabled={!selectedClient?.id}
              onClick={() =>
                void runAction(
                  state?.activeRecording ? t('popup.recordingSaved') : t('popup.recordingStarted'),
                  async () => {
                    if (state?.activeRecording) {
                      await stopRecording(recordingName.trim(), recordingDescription.trim())
                      setRecordingName('')
                      setRecordingDescription('')
                      return
                    }

                    await startRecording(selectedClient?.id)
                  }
                )
              }
            >
              <FiberManualRecordOutlined fontSize="small" color={state?.activeRecording ? 'error' : 'inherit'} />
            </ActionIcon>
            <ActionIcon
              label={t('popup.captureResource')}
              disabled={!selectedClient?.id}
              onClick={() =>
                void runAction(t('popup.selectorCaptureArmed'), async () => {
                  await startSelectorCapture(selectedClient?.id)
                })
              }
            >
              <InsertDriveFileOutlined fontSize="small" />
            </ActionIcon>
            <ActionIcon
              label={t('popup.addSkill')}
              disabled={!selectedClient?.id}
              onClick={() =>
                void openOptionsSection('assets', {
                  clientId: selectedClient?.id,
                  assetTab: 'skills'
                })
              }
            >
              <AutoAwesomeOutlined fontSize="small" />
            </ActionIcon>
            <ActionIcon
              label={t('popup.injectBridge')}
              disabled={!selectedClient?.id}
              onClick={() =>
                void runAction(
                  t('popup.bridgeInjected'),
                  async () => {
                    await injectBridge(selectedClient?.id)
                  },
                  {
                    suggestSelectedClientPrimary: true
                  }
                )
              }
            >
              <HubOutlined fontSize="small" />
            </ActionIcon>
          </Stack>
        </Stack>

        {state?.activeRecording ? (
          <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
            <TextField
              size="small"
              label={t('popup.flowName')}
              value={recordingName}
              onChange={(event) => setRecordingName(event.target.value)}
              fullWidth
            />
            <TextField
              size="small"
              label={t('common.summary')}
              value={recordingDescription}
              onChange={(event) => setRecordingDescription(event.target.value)}
              fullWidth
            />
          </Stack>
        ) : null}

        {state?.pendingSelectorCapture ? (
          <Alert
            sx={{ mt: 1.25 }}
            severity="success"
            action={
              <Tooltip title={t('popup.dismiss')}>
                <IconButton
                  size="small"
                  onClick={() =>
                    void runAction(t('popup.selectorCaptureCleared'), async () => {
                      await clearPendingSelectorCapture()
                    })
                  }
                >
                  <FolderOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          >
            {t('popup.capturedSelector', { selector: state.pendingSelectorCapture.resource.selector })}
          </Alert>
        ) : null}
      </Paper>

      {surface === 'popup' ? (
        <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
          {footer}
        </Typography>
      ) : null}
    </Stack>
  )
}

function ActionIcon({
  children,
  disabled,
  emphasis,
  label,
  onClick
}: {
  children: ReactNode
  disabled?: boolean
  emphasis?: boolean
  label: string
  onClick: () => void
}) {
  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          aria-label={label}
          size="small"
          onClick={onClick}
          disabled={disabled}
          sx={
            emphasis
              ? {
                  bgcolor: 'primary.main',
                  color: '#fff',
                  '&:hover': {
                    bgcolor: 'primary.main',
                    opacity: 0.92
                  }
                }
              : undefined
          }
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  )
}
