import AddOutlined from '@mui/icons-material/AddOutlined'
import BrightnessAutoOutlined from '@mui/icons-material/BrightnessAutoOutlined'
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined'
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import DownloadOutlined from '@mui/icons-material/DownloadOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import FileUploadOutlined from '@mui/icons-material/FileUploadOutlined'
import HubOutlined from '@mui/icons-material/HubOutlined'
import RefreshOutlined from '@mui/icons-material/RefreshOutlined'
import RouteOutlined from '@mui/icons-material/RouteOutlined'
import SaveOutlined from '@mui/icons-material/SaveOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import StarBorderOutlined from '@mui/icons-material/StarBorderOutlined'
import StarOutlined from '@mui/icons-material/StarOutlined'
import StorageOutlined from '@mui/icons-material/StorageOutlined'
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined'
import LightModeOutlined from '@mui/icons-material/LightModeOutlined'
import TranslateOutlined from '@mui/icons-material/TranslateOutlined'
import WindowOutlined from '@mui/icons-material/WindowOutlined'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Divider,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material'
import { type MouseEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import type { PopupState } from '#~/background/shared.js'
import {
  buildRepositoryWorkspaceBundleUrl,
  canCreateRouteClientFromUrl,
  type BackgroundClientConfig,
  type ClientIconKey,
  type ExtensionConfig,
  getOriginMatchPattern,
  type MarketSourceConfig,
  type MarketSourceProvider,
  type MarketSourceRefType,
  type RouteClientConfig,
  createMarketSourceConfig,
  createRepositoryMarketSourceConfig,
  createRouteClientConfig,
  isValidMarketSourceUrl,
  isValidMatchPattern,
  isValidServerUrl,
  matchesRouteClient,
  normalizeConfig,
  stringifyMatchPatterns
} from '#~/shared/config.js'
import {
  type OptionsAssetsTab,
  createPresetRouteClient,
  getRuntimeStatus,
  loadWorkspaceConfig,
  refreshRuntime,
  saveWorkspaceConfig
} from './extension-api.js'
import { type AppearancePreference, useAppearance } from './appearance.js'
import { getClientIconLabel, renderClientIcon } from './client-icons.js'
import { type LocalePreference, useI18n } from './i18n.js'
import {
  countInstalledMarketClients,
  createInstalledMarketClient,
  fetchMarketCatalog,
  type MarketCatalogClientEntry,
  type MarketCatalogSourceData,
  type MarketCatalogSourceResult
} from './market-catalog.js'
import {
  fetchWorkspaceBundleFromUrl,
  formatWorkspaceBundleError,
  parseWorkspaceBundleText,
  serializeWorkspaceBundle,
  summarizeWorkspaceBundleText
} from './workspace-bundle.js'

type Section = 'workspace' | 'settings' | 'clients' | 'market'
type TransferMode = 'import' | 'export'
type ClientDetailTab = 'basics' | 'matching' | 'runtime' | 'assets'
type EditableClientId = 'background' | string
type MarketSourceDraftInput =
  | {
      sourceId?: string
      mode: 'direct'
      url: string
    }
  | {
      sourceId?: string
      mode: 'repository'
      provider: MarketSourceProvider
      repository: string
      refType: MarketSourceRefType
      ref: string
    }
type ImportSourceDraftInput =
  | {
      mode: 'direct'
      url: string
    }
  | {
      mode: 'repository'
      provider: MarketSourceProvider
      repository: string
      refType: MarketSourceRefType
      ref: string
    }
type OptionsRouteState = {
  assetTab?: OptionsAssetsTab
  clientDetailOpen: boolean
  clientId?: EditableClientId
  marketDetailOpen: boolean
  marketEntryKey?: string
  section: Section
}

const ICON_OPTIONS: ClientIconKey[] = [
  'chrome',
  'route',
  'robot',
  'code',
  'layers',
  'insights',
  'spark',
  'javascript',
  'html',
  'css'
]

const BACKGROUND_BUILT_IN_TOOLS = [
  'extension.getStatus',
  'extension.getConfig',
  'extension.listGrantedOrigins',
  'extension.listTabs',
  'extension.activateTab',
  'extension.reloadTab',
  'extension.createTab',
  'extension.closeTab',
  'extension.showNotification',
  'extension.openOptionsPage'
]

const BACKGROUND_BUILT_IN_RESOURCES = [
  'chrome-extension://status',
  'chrome-extension://config',
  'chrome-extension://tabs'
]

function IconPicker({
  label,
  onChange,
  value
}: {
  label: string
  onChange: (icon: ClientIconKey) => void
  value: ClientIconKey
}) {
  return (
    <Autocomplete<ClientIconKey, false, false, false>
      options={ICON_OPTIONS}
      value={value}
      onChange={(_event, nextValue) => {
        if (nextValue) {
          onChange(nextValue)
        }
      }}
      getOptionLabel={(option) => getClientIconLabel(option)}
      isOptionEqualToValue={(option, currentValue) => option === currentValue}
      renderOption={(props, option) => (
        <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ color: 'text.secondary', display: 'grid', placeItems: 'center' }}>
            {renderClientIcon(option)}
          </Box>
          <Typography variant="body2">{getClientIconLabel(option)}</Typography>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label={label}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                <Box
                  sx={{
                    color: 'text.secondary',
                    display: 'grid',
                    placeItems: 'center',
                    mr: 1
                  }}
                >
                  {renderClientIcon(value)}
                </Box>
                {params.InputProps.startAdornment}
              </>
            )
          }}
        />
      )}
    />
  )
}

const SECTION_IDS: Section[] = ['workspace', 'settings', 'clients', 'market']

function createLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function uniqueEditableIds(values: EditableClientId[]): EditableClientId[] {
  return values.filter((value, index) => values.indexOf(value) === index)
}

function formatSurfaceUrlLabel(url: string | undefined): string | undefined {
  if (!url) {
    return undefined
  }

  try {
    const parsed = new URL(url)
    return `${parsed.host}${parsed.pathname === '/' ? '' : parsed.pathname}`
  } catch {
    return url
  }
}

function isOptionsAssetsTab(value: string | null | undefined): value is OptionsAssetsTab {
  return value === 'flows' || value === 'resources' || value === 'skills'
}

function buildOptionsHashPath(
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

function getOptionsRouteFromLocation(): OptionsRouteState {
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

function normalizeOptionsLocation(): OptionsRouteState {
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

export function OptionsApp() {
  const { preference, setPreference, t } = useI18n()
  const { preference: appearancePreference, setPreference: setAppearancePreference } = useAppearance()
  const initialRoute = getOptionsRouteFromLocation()
  const [draft, setDraft] = useState<ExtensionConfig>()
  const [runtimeState, setRuntimeState] = useState<PopupState>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [status, setStatus] = useState<string>()
  const [statusTone, setStatusTone] = useState<'info' | 'success' | 'error'>('info')
  const [statusOpen, setStatusOpen] = useState(false)
  const [section, setSection] = useState<Section>(initialRoute.section)
  const [assetTabHint, setAssetTabHint] = useState<OptionsAssetsTab | undefined>(initialRoute.assetTab)
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(initialRoute.clientId)
  const [clientDetailOpen, setClientDetailOpen] = useState(initialRoute.clientDetailOpen)
  const [selectedMarketEntryKey, setSelectedMarketEntryKey] = useState<string | undefined>(initialRoute.marketEntryKey)
  const [marketDetailOpen, setMarketDetailOpen] = useState(initialRoute.marketDetailOpen)
  const [routeSearch, setRouteSearch] = useState('')
  const [transferMode, setTransferMode] = useState<TransferMode>('export')
  const [transferDraft, setTransferDraft] = useState('')
  const [transferUrl, setTransferUrl] = useState('')
  const [transferSourceMode, setTransferSourceMode] = useState<'direct' | 'repository'>('direct')
  const [transferProvider, setTransferProvider] = useState<MarketSourceProvider>('github')
  const [transferRepository, setTransferRepository] = useState('')
  const [transferRefType, setTransferRefType] = useState<MarketSourceRefType>('branch')
  const [transferRef, setTransferRef] = useState('main')
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState('')
  const importInputRef = useRef<HTMLInputElement>(null)

  const navItems: Array<{ id: Section; label: string; icon: ReactNode }> = [
    { id: 'workspace', label: t('options.nav.workspace'), icon: <StorageOutlined fontSize="small" /> },
    { id: 'clients', label: t('options.nav.clients'), icon: <RouteOutlined fontSize="small" /> },
    { id: 'market', label: t('options.nav.market'), icon: <StorefrontOutlined fontSize="small" /> }
  ]

  const localeOptions: LocalePreference[] = ['auto', 'zh-CN', 'en']
  const appearanceOptions: AppearancePreference[] = ['auto', 'light', 'dark']

  function notify(message: string, tone: 'info' | 'success' | 'error') {
    setStatus(message)
    setStatusTone(tone)
    setStatusOpen(true)
  }

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

  useEffect(() => {
    void bootstrap()
  }, [])

  const dirty = draft ? JSON.stringify(normalizeConfig(draft)) !== lastSavedSnapshot : false

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) {
        return
      }

      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void handleSave()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [draft, lastSavedSnapshot, t])

  useEffect(() => {
    if (!selectedClientId && draft?.routeClients[0]?.id) {
      setSelectedClientId(draft.routeClients[0].id)
    }
  }, [draft?.routeClients, selectedClientId])

  async function bootstrap() {
    try {
      setLoading(true)
      const [nextDraft, nextRuntime] = await Promise.all([loadWorkspaceConfig(), getRuntimeStatus()])
      setDraft(nextDraft)
      setRuntimeState(nextRuntime)
      const routeState = normalizeOptionsLocation()
      if (routeState.clientId) {
        setSelectedClientId(routeState.clientId)
      }
      setSelectedMarketEntryKey(routeState.marketEntryKey)
      setMarketDetailOpen(routeState.marketDetailOpen)
      setAssetTabHint(routeState.assetTab)
      setTransferDraft(serializeWorkspaceBundle(nextDraft))
      setLastSavedSnapshot(JSON.stringify(normalizeConfig(nextDraft)))
    } catch (nextError) {
      setError(String(nextError))
    } finally {
      setLoading(false)
    }
  }

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

  function updateDraft(recipe: (current: ExtensionConfig) => ExtensionConfig) {
    setDraft((current) => (current ? normalizeConfig(recipe(current)) : current))
  }

  useEffect(() => {
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined

    const scheduleRefresh = () => {
      if (timeoutId !== undefined) {
        globalThis.clearTimeout(timeoutId)
      }

      timeoutId = globalThis.setTimeout(() => {
        void syncRuntimeState(false)
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

    chrome.tabs.onActivated.addListener(scheduleRefresh)
    chrome.tabs.onUpdated.addListener(onTabUpdated)
    chrome.tabs.onRemoved.addListener(scheduleRefresh)
    chrome.windows.onFocusChanged.addListener(scheduleRefresh)
    chrome.storage.onChanged.addListener(onStorageChanged)

    return () => {
      if (timeoutId !== undefined) {
        globalThis.clearTimeout(timeoutId)
      }

      chrome.tabs.onActivated.removeListener(scheduleRefresh)
      chrome.tabs.onUpdated.removeListener(onTabUpdated)
      chrome.tabs.onRemoved.removeListener(scheduleRefresh)
      chrome.windows.onFocusChanged.removeListener(scheduleRefresh)
      chrome.storage.onChanged.removeListener(onStorageChanged)
    }
  }, [])

  async function syncRuntimeState(showStatus = false, forceRuntimeRefresh = false) {
    try {
      if (forceRuntimeRefresh) {
        await refreshRuntime()
      }

      const nextRuntime = await getRuntimeStatus()
      setRuntimeState(nextRuntime)

      if (showStatus) {
        notify(t('options.status.runtimeRefreshed'), 'success')
      }
    } catch (nextError) {
      if (showStatus) {
        notify(String(nextError), 'error')
      }
    }
  }

  async function handleSave() {
    if (!draft) {
      return
    }

    try {
      if (!isValidServerUrl(draft.serverUrl)) {
        throw new Error(t('options.error.invalidServerUrl'))
      }

      for (const routeClient of draft.routeClients) {
        for (const pattern of routeClient.matchPatterns) {
          if (!isValidMatchPattern(pattern)) {
            throw new Error(
              t('options.error.invalidMatchPattern', {
                clientName: routeClient.clientName,
                pattern
              })
            )
          }
        }
      }

      const requestedOrigins = [
        ...new Set(
          [
            ...draft.routeClients.flatMap((client) => client.matchPatterns),
            ...draft.marketSources
              .map((source) => getOriginMatchPattern(source.url))
              .filter((pattern): pattern is string => Boolean(pattern))
          ]
        )
      ]
      if (requestedOrigins.length > 0) {
        const granted = await chrome.permissions.request({
          origins: requestedOrigins
        })

        if (!granted) {
          throw new Error(t('options.error.hostAccessDenied'))
        }
      }

      const saved = await saveWorkspaceConfig(draft)
      await refreshRuntime()
      const nextRuntime = await getRuntimeStatus()
      setDraft(saved)
      setRuntimeState(nextRuntime)
      setLastSavedSnapshot(JSON.stringify(normalizeConfig(saved)))
      setTransferDraft(serializeWorkspaceBundle(saved))
      notify(t('options.status.saved'), 'success')
    } catch (nextError) {
      notify(String(nextError), 'error')
    }
  }

  async function handleRefreshRuntime() {
    await syncRuntimeState(true, true)
  }

  function handleDiscardChanges() {
    if (!lastSavedSnapshot) {
      return
    }

    const restored = normalizeConfig(JSON.parse(lastSavedSnapshot))
    setDraft(restored)
    setTransferDraft(serializeWorkspaceBundle(restored))
    notify(t('options.status.discarded'), 'info')
  }

  async function addMarketSource(input: MarketSourceDraftInput) {
    if (!draft) {
      return
    }

    const source = input.mode === 'direct'
      ? (() => {
          const normalizedUrl = input.url.trim()

          if (!isValidMarketSourceUrl(normalizedUrl)) {
            throw new Error(t('options.error.invalidMarketSourceUrl'))
          }

          return createMarketSourceConfig(normalizedUrl)
        })()
      : (() => {
          if (!input.repository.trim() || !input.ref.trim()) {
            throw new Error(t('options.error.invalidRepositoryMarketSource'))
          }

          return createRepositoryMarketSourceConfig({
            provider: input.provider,
            repository: input.repository,
            refType: input.refType,
            ref: input.ref
          })
        })()

    if (draft.marketSources.some((item) => item.url === source.url && item.id !== input.sourceId)) {
      throw new Error(t('options.error.marketSourceExists'))
    }

    const originPattern = getOriginMatchPattern(source.url)

    if (!originPattern) {
      throw new Error(t('options.error.invalidMarketSourceUrl'))
    }

    const granted = await chrome.permissions.request({
      origins: [originPattern]
    })

    if (!granted) {
      throw new Error(t('options.error.marketSourceAccessDenied'))
    }

    updateDraft((current) => ({
      ...current,
      marketSources: input.sourceId
        ? current.marketSources.map((item) => (item.id === input.sourceId ? { ...source, id: input.sourceId } : item))
        : [...current.marketSources, source]
    }))
    notify(
      t(input.sourceId ? 'options.status.marketSourceUpdated' : 'options.status.marketSourceAdded'),
      'success'
    )
  }

  function removeMarketSource(sourceId: string) {
    updateDraft((current) => ({
      ...current,
      marketSources: current.marketSources.filter((source) => source.id !== sourceId)
    }))
    notify(t('options.status.marketSourceRemoved'), 'info')
  }

  function installMarketClient(catalog: MarketCatalogSourceData, entry: MarketCatalogClientEntry) {
    if (!draft) {
      return
    }

    const existingCount = countInstalledMarketClients(draft.routeClients, catalog.source.url, entry.id)
    const nextClient = createInstalledMarketClient({
      catalog,
      entry,
      existingCount
    })

    updateDraft((current) => ({
      ...current,
      routeClients: [nextClient, ...current.routeClients]
    }))
    setSelectedClientId(nextClient.id)
    setSectionAndHash('clients', { clientId: nextClient.id, clientDetailOpen: true })
    notify(t('options.status.marketClientInstalled', { name: nextClient.clientName }), 'success')
  }

  function exportWorkspace() {
    if (!draft) {
      return
    }

    const next = serializeWorkspaceBundle(draft)
    setTransferDraft(next)
    setTransferMode('export')
    notify(t('options.status.exportPrepared'), 'success')
  }

  function downloadWorkspace() {
    const blob = new Blob([transferDraft], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'mdp-chrome-workspace.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function copyTransferDraft() {
    await navigator.clipboard.writeText(transferDraft)
    notify(
      t(
        transferMode === 'export'
          ? 'options.status.transferCopied.export'
          : 'options.status.transferCopied.import'
      ),
      'success'
    )
  }

  function applyImport() {
    try {
      const next = parseWorkspaceBundleText(transferDraft)
      setDraft(next)
      setSelectedClientId(next.routeClients[0]?.id)
      setTransferMode('import')
      notify(t('options.status.importApplied'), 'success')
    } catch (nextError) {
      notify(formatWorkspaceBundleError(nextError), 'error')
    }
  }

  async function readImportFile(file: File | undefined) {
    if (!file) {
      return
    }

    const text = await file.text()
    setTransferDraft(text)
    setTransferMode('import')
    notify(t('options.status.importLoaded', { name: file.name }), 'success')
  }

  async function fetchImportFromSource(input: ImportSourceDraftInput) {
    const resolvedUrl = (() => {
      if (input.mode === 'direct') {
        const normalizedUrl = input.url.trim()

        if (!isValidMarketSourceUrl(normalizedUrl)) {
          throw new Error(t('options.error.invalidImportUrl'))
        }

        return normalizedUrl
      }

      if (!input.repository.trim() || !input.ref.trim()) {
        throw new Error(t('options.error.invalidRepositoryImportSource'))
      }

      return buildRepositoryWorkspaceBundleUrl(input.provider, input.repository, input.ref)
    })()

    const originPattern = getOriginMatchPattern(resolvedUrl)

    if (!originPattern) {
      throw new Error(t('options.error.invalidImportUrl'))
    }

    const granted = await chrome.permissions.request({
      origins: [originPattern]
    })

    if (!granted) {
      throw new Error(t('options.error.importUrlAccessDenied'))
    }

    const text = await fetchWorkspaceBundleFromUrl(resolvedUrl)
    setTransferDraft(text)
    if (input.mode === 'direct') {
      setTransferUrl(resolvedUrl)
    }
    setTransferMode('import')
    notify(
      t(
        input.mode === 'direct'
          ? 'options.status.importUrlLoaded'
          : 'options.status.importRepositoryLoaded'
      ),
      'success'
    )
  }

  if (loading) {
    return <Alert severity="info">{t('options.loadingWorkspace')}</Alert>
  }

  if (!draft) {
    return <Alert severity="error">{error ?? t('options.loadFailed')}</Alert>
  }

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '220px minmax(0, 1fr)' },
        bgcolor: 'background.default',
        overflow: 'hidden'
      }}
    >
      <Box
        component="aside"
        sx={{
          bgcolor: 'action.hover',
          height: '100vh',
          overflow: 'hidden'
        }}
      >
        <Box
          sx={{
            height: '100%',
            display: 'grid',
            gridTemplateRows: 'auto minmax(0, 1fr) auto'
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              px: 1.5,
              py: 1.5,
              minHeight: 56,
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}
          >
              <Box
                component="img"
                src={chrome.runtime.getURL('icons/icon-32.png')}
                alt="MDP"
                sx={{ width: 28, height: 28, display: 'block', flexShrink: 0 }}
              />
              <Typography variant="subtitle2" noWrap>
                {t('options.brand')}
              </Typography>
          </Stack>

          <Box sx={{ minHeight: 0, overflow: 'auto', px: 1.25 }}>
            <List dense disablePadding>
              {navItems.map((item) => (
                <ListItem key={item.id} disablePadding sx={{ mb: 0.25 }}>
                  <ListItemButton
                    selected={section === item.id}
                    onClick={() => setSectionAndHash(item.id, { clientDetailOpen: false })}
                    sx={{ minHeight: 40, px: 1 }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, color: section === item.id ? 'primary.main' : 'text.secondary' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.label} primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>

          <Stack spacing={1} sx={{ p: 1.25 }}>
            <Divider />
            <Stack spacing={1}>
              <Stack spacing={0.5}>
                <Autocomplete<LocalePreference, false, false, false>
                  size="small"
                  options={localeOptions}
                  value={preference}
                  onChange={(_event, nextValue) => {
                    if (nextValue) {
                      void setPreference(nextValue)
                    }
                  }}
                  getOptionLabel={(option) => t(`options.locale.${option}`)}
                  isOptionEqualToValue={(option, currentValue) => option === currentValue}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      placeholder={t('options.workspace.language')}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <TranslateOutlined fontSize="small" />
                            <Box sx={{ width: 8, flexShrink: 0 }} />
                            {params.InputProps.startAdornment}
                          </>
                        )
                      }}
                    />
                  )}
                />
              </Stack>

              <Stack spacing={0.5}>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  size="small"
                  value={appearancePreference}
                  onChange={(_event, nextValue: AppearancePreference | null) => {
                    if (nextValue) {
                      void setAppearancePreference(nextValue)
                    }
                  }}
                >
                  {appearanceOptions.map((option) => (
                    <ToggleButton
                      key={option}
                      value={option}
                      aria-label={t(`options.appearance.${option}`)}
                      title={t(`options.appearance.${option}`)}
                    >
                      {option === 'auto' ? (
                        <BrightnessAutoOutlined fontSize="small" />
                      ) : option === 'light' ? (
                        <LightModeOutlined fontSize="small" />
                      ) : (
                        <DarkModeOutlined fontSize="small" />
                      )}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Stack>

              <List dense disablePadding>
              <ListItem disablePadding>
                <ListItemButton
                  selected={section === 'settings'}
                  onClick={() => setSectionAndHash('settings', { clientDetailOpen: false })}
                  sx={{ minHeight: 40, px: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: section === 'settings' ? 'primary.main' : 'text.secondary' }}>
                    <SettingsOutlined fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('options.nav.settings')}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                  />
                </ListItemButton>
              </ListItem>
              </List>
            </Stack>
          </Stack>
        </Box>
      </Box>

      <Box
        sx={{
          height: '100vh',
          display: 'grid',
          gridTemplateRows: 'auto minmax(0, 1fr) auto',
          minWidth: 0,
          bgcolor: 'background.default'
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            px: 1.5,
            py: 1.5,
            minHeight: 56,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default'
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {section === 'workspace' && t('options.header.workspace')}
            {section === 'settings' && t('options.header.settings')}
            {section === 'clients' && t('options.header.clients')}
            {section === 'market' && t('options.header.market')}
          </Typography>
        </Stack>

        <Stack spacing={1.5} sx={{ p: 1.5, minHeight: 0, overflow: 'auto' }}>
          {section === 'workspace' ? (
            <WorkspaceSection
              draft={draft}
              dirty={dirty}
              runtimeState={runtimeState}
            />
          ) : null}

          {section === 'settings' ? (
            <GlobalSettingsSection
              appearancePreference={appearancePreference}
              draft={draft}
              importInputRef={importInputRef}
              localePreference={preference}
              transferDraft={transferDraft}
              transferMode={transferMode}
              transferProvider={transferProvider}
              transferRef={transferRef}
              transferRefType={transferRefType}
              transferRepository={transferRepository}
              transferSourceMode={transferSourceMode}
              transferUrl={transferUrl}
              onChange={setDraft}
              onMarketAutoCheckChange={(nextValue) =>
                setDraft((current) => (current ? { ...current, marketAutoCheckUpdates: nextValue } : current))
              }
              onAppearancePreferenceChange={setAppearancePreference}
              onApplyImport={applyImport}
              onCopy={() => void copyTransferDraft()}
              onDownload={downloadWorkspace}
              onExport={() => exportWorkspace()}
              onFetchImport={(input) =>
                void fetchImportFromSource(input).catch((error) => {
                  notify(formatWorkspaceBundleError(error), 'error')
                })
              }
              onLocalePreferenceChange={setPreference}
              onReadImportFile={(file) => void readImportFile(file)}
              onTransferDraftChange={setTransferDraft}
              onTransferProviderChange={setTransferProvider}
              onTransferRefChange={setTransferRef}
              onTransferRefTypeChange={setTransferRefType}
              onTransferRepositoryChange={setTransferRepository}
              onTransferSourceModeChange={setTransferSourceMode}
              onTransferModeChange={setTransferMode}
              onTransferUrlChange={setTransferUrl}
              onUpload={() => importInputRef.current?.click()}
            />
          ) : null}

          {section === 'clients' ? (
            <ClientsSection
              clientDetailOpen={clientDetailOpen}
              canCreateFromPage={canCreateRouteClientFromUrl(runtimeState?.activeTab?.url)}
              draft={draft}
              initialAssetTab={assetTabHint}
              initialDetailTab={assetTabHint ? 'assets' : undefined}
              routeSearch={routeSearch}
              selectedClientId={selectedClientId}
              runtimeState={runtimeState}
              onCloseDetail={() => setSectionAndHash('clients', { clientDetailOpen: false })}
              onOpenDetail={(clientId, detailTab) => {
                setSelectedClientId(clientId)
                setSectionAndHash('clients', {
                  clientId,
                  clientDetailOpen: true,
                  ...(detailTab === 'assets' ? { assetTab: assetTabHint ?? 'flows' } : {})
                })
              }}
              onRouteSearchChange={setRouteSearch}
              onSelectClient={(clientId) => setSelectedClientId(clientId)}
              onChange={setDraft}
              onCreateClient={(kind) => {
                if (kind === 'background') {
                  setSelectedClientId('background')
                  setSectionAndHash('clients', { clientId: 'background', clientDetailOpen: true })
                  notify(t('options.status.backgroundOpened'), 'info')
                  return
                }

                const nextClient = createRouteClientConfig({
                  clientName: t('options.clients.defaultName', { count: draft.routeClients.length + 1 }),
                  clientId: `mdp-route-client-${draft.routeClients.length + 1}`,
                  icon: (draft.routeClients.length + 1) % 2 === 0 ? 'layers' : 'route'
                })
                updateDraft((current) => ({
                  ...current,
                  routeClients: [...current.routeClients, nextClient]
                }))
                setSelectedClientId(nextClient.id)
                setSectionAndHash('clients', { clientId: nextClient.id, clientDetailOpen: true })
                notify(t('options.status.clientAdded'), 'success')
              }}
              onCreateClientFromPage={() => {
                const activeUrl = runtimeState?.activeTab?.url
                if (!activeUrl || !canCreateRouteClientFromUrl(activeUrl)) {
                  return
                }

                const nextClient = createPresetRouteClient(activeUrl)
                updateDraft((current) => ({
                  ...current,
                  routeClients: [nextClient, ...current.routeClients]
                }))
                setSelectedClientId(nextClient.id)
                setSectionAndHash('clients', { clientId: nextClient.id, clientDetailOpen: true })
                notify(t('options.status.routePresetCreated'), 'success')
              }}
            />
          ) : null}

          {section === 'market' ? (
            <MarketSection
              marketDetailOpen={marketDetailOpen}
              marketSources={draft.marketSources}
              marketUpdates={runtimeState?.marketUpdates}
              routeClients={draft.routeClients}
              selectedEntryKey={selectedMarketEntryKey}
              onAddSource={async (input) => {
                try {
                  await addMarketSource(input)
                } catch (error) {
                  notify(String(error), 'error')
                  throw error
                }
              }}
              onInstall={installMarketClient}
              onCloseDetail={() => setSectionAndHash('market', { marketDetailOpen: false, marketEntryKey: undefined })}
              onOpenDetail={(entryKey) =>
                setSectionAndHash('market', { marketEntryKey: entryKey, marketDetailOpen: true })
              }
              onRemoveSource={removeMarketSource}
            />
          ) : null}

        </Stack>

        {dirty ? (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            sx={{
              px: 1.5,
              py: 0.875,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper'
            }}
          >
            <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 600 }}>
              {t('options.unsavedChanges')}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="text" onClick={handleDiscardChanges}>
                {t('options.discardChanges')}
              </Button>
              <Button size="small" variant="contained" onClick={() => void handleSave()}>
                {t('options.saveChanges')}
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Box />
        )}
        <Snackbar
          open={statusOpen && Boolean(status)}
          autoHideDuration={3200}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          onClose={(_event, reason) => {
            if (reason === 'clickaway') {
              return
            }

            setStatusOpen(false)
          }}
          sx={{ mt: 1, mr: 1 }}
        >
          <Alert
            severity={statusTone}
            variant="filled"
            onClose={() => setStatusOpen(false)}
            sx={{ minWidth: 280 }}
          >
            {status}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  )
}

function WorkspaceSection({
  dirty,
  draft,
  runtimeState
}: {
  dirty: boolean
  draft: ExtensionConfig
  runtimeState: PopupState | undefined
}) {
  const { t } = useI18n()
  const enabledRouteCount = draft.routeClients.filter((client) => client.enabled).length

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1 }}>
      <OverviewStat
        label={t('options.workspace.overview.routes', { count: draft.routeClients.length })}
        icon={<RouteOutlined fontSize="small" />}
      />
      <OverviewStat
        label={t('options.workspace.overview.enabledRoutes', { count: enabledRouteCount })}
        icon={<SettingsOutlined fontSize="small" />}
      />
      <OverviewStat
        label={t('options.workspace.overview.onlineClients', { count: runtimeState?.onlineClientCount ?? 0 })}
        icon={<HubOutlined fontSize="small" />}
      />
      <OverviewStat
        label={dirty ? t('options.workspace.overview.draft') : t('options.workspace.overview.saved')}
        icon={<StorageOutlined fontSize="small" />}
        tone={dirty ? 'warning.main' : 'success.main'}
      />
    </Box>
  )
}

function GlobalSettingsSection({
  appearancePreference,
  draft,
  importInputRef,
  localePreference,
  transferDraft,
  transferMode,
  transferProvider,
  transferRef,
  transferRefType,
  transferRepository,
  transferSourceMode,
  transferUrl,
  onChange,
  onMarketAutoCheckChange,
  onAppearancePreferenceChange,
  onApplyImport,
  onCopy,
  onDownload,
  onExport,
  onFetchImport,
  onLocalePreferenceChange,
  onReadImportFile,
  onTransferDraftChange,
  onTransferProviderChange,
  onTransferRefChange,
  onTransferRefTypeChange,
  onTransferRepositoryChange,
  onTransferSourceModeChange,
  onTransferModeChange,
  onTransferUrlChange,
  onUpload
}: {
  appearancePreference: AppearancePreference
  draft: ExtensionConfig
  importInputRef: React.RefObject<HTMLInputElement | null>
  localePreference: LocalePreference
  transferDraft: string
  transferMode: TransferMode
  transferProvider: MarketSourceProvider
  transferRef: string
  transferRefType: MarketSourceRefType
  transferRepository: string
  transferSourceMode: 'direct' | 'repository'
  transferUrl: string
  onChange: (config: ExtensionConfig) => void
  onMarketAutoCheckChange: (nextValue: boolean) => void
  onAppearancePreferenceChange: (next: AppearancePreference) => Promise<void>
  onApplyImport: () => void
  onCopy: () => void
  onDownload: () => void
  onExport: () => void
  onFetchImport: (input: ImportSourceDraftInput) => void
  onLocalePreferenceChange: (next: LocalePreference) => Promise<void>
  onReadImportFile: (file: File | undefined) => void
  onTransferDraftChange: (value: string) => void
  onTransferProviderChange: (value: MarketSourceProvider) => void
  onTransferRefChange: (value: string) => void
  onTransferRefTypeChange: (value: MarketSourceRefType) => void
  onTransferRepositoryChange: (value: string) => void
  onTransferSourceModeChange: (value: 'direct' | 'repository') => void
  onTransferModeChange: (mode: TransferMode) => void
  onTransferUrlChange: (value: string) => void
  onUpload: () => void
}) {
  const { t } = useI18n()
  const settingsFieldLayout = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    pt: 1,
    gap: 1.25
  } as const

  return (
    <Stack spacing={1.5}>
      <SectionPanel
        title={t('options.workspace.appearanceSection.title')}
        description={t('options.workspace.appearanceSection.description')}
        icon={<SettingsOutlined fontSize="small" />}
      >
        <Box sx={settingsFieldLayout}>
          <TextField
            size="small"
            select
            label={t('options.workspace.language')}
            value={localePreference}
            onChange={(event) => void onLocalePreferenceChange(event.target.value as LocalePreference)}
          >
            <MenuItem value="auto">{t('options.locale.auto')}</MenuItem>
            <MenuItem value="en">{t('options.locale.en')}</MenuItem>
            <MenuItem value="zh-CN">{t('options.locale.zh-CN')}</MenuItem>
          </TextField>
          <TextField
            size="small"
            select
            label={t('options.workspace.appearance')}
            value={appearancePreference}
            onChange={(event) => void onAppearancePreferenceChange(event.target.value as AppearancePreference)}
          >
            <MenuItem value="auto">{t('options.appearance.auto')}</MenuItem>
            <MenuItem value="light">{t('options.appearance.light')}</MenuItem>
            <MenuItem value="dark">{t('options.appearance.dark')}</MenuItem>
          </TextField>
        </Box>
      </SectionPanel>

      <SectionPanel
        title={t('options.workspace.defaultClient.title')}
        description={t('options.workspace.defaultClient.description')}
        icon={<HubOutlined fontSize="small" />}
      >
        <Box sx={settingsFieldLayout}>
          <TextField
            size="small"
            label={t('options.workspace.serverUrl')}
            value={draft.serverUrl}
            onChange={(event) => onChange({ ...draft, serverUrl: event.target.value })}
          />
          <TextField
            size="small"
            label={t('options.workspace.notificationTitle')}
            value={draft.notificationTitle}
            onChange={(event) => onChange({ ...draft, notificationTitle: event.target.value })}
          />
        </Box>
      </SectionPanel>

      <SectionPanel
        title={t('options.market.settingsTitle')}
        description={t('options.market.settingsDescription')}
        icon={<StorefrontOutlined fontSize="small" />}
      >
        <FormControlLabel
          control={
            <Switch
              checked={draft.marketAutoCheckUpdates}
              onChange={(_event, checked) => onMarketAutoCheckChange(checked)}
            />
          }
          label={t('options.market.autoCheck')}
        />
      </SectionPanel>

      <ImportsSection
        importInputRef={importInputRef}
        transferDraft={transferDraft}
        transferMode={transferMode}
        transferProvider={transferProvider}
        transferRef={transferRef}
        transferRefType={transferRefType}
        transferRepository={transferRepository}
        transferSourceMode={transferSourceMode}
        transferUrl={transferUrl}
        onApplyImport={onApplyImport}
        onCopy={onCopy}
        onDownload={onDownload}
        onExport={onExport}
        onFetchImport={onFetchImport}
        onReadImportFile={onReadImportFile}
        onTransferDraftChange={onTransferDraftChange}
        onTransferProviderChange={onTransferProviderChange}
        onTransferRefChange={onTransferRefChange}
        onTransferRefTypeChange={onTransferRefTypeChange}
        onTransferRepositoryChange={onTransferRepositoryChange}
        onTransferSourceModeChange={onTransferSourceModeChange}
        onTransferModeChange={onTransferModeChange}
        onTransferUrlChange={onTransferUrlChange}
        onUpload={onUpload}
      />
    </Stack>
  )
}

function OverviewStat({
  icon,
  label,
  tone = 'text.secondary'
}: {
  icon: ReactNode
  label: string
  tone?: string
}) {
  return (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      sx={{
        minHeight: 40,
        px: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '10px'
      }}
    >
      <Box sx={{ color: tone, display: 'grid', placeItems: 'center' }}>{icon}</Box>
      <Typography variant="body2" color={tone}>
        {label}
      </Typography>
    </Stack>
  )
}

function ClientsSection({
  clientDetailOpen,
  canCreateFromPage,
  draft,
  initialAssetTab,
  initialDetailTab,
  routeSearch,
  selectedClientId,
  runtimeState,
  onCloseDetail,
  onOpenDetail,
  onRouteSearchChange,
  onSelectClient,
  onChange,
  onCreateClient,
  onCreateClientFromPage
}: {
  clientDetailOpen: boolean
  canCreateFromPage: boolean
  draft: ExtensionConfig
  initialAssetTab: OptionsAssetsTab | undefined
  initialDetailTab: ClientDetailTab | undefined
  routeSearch: string
  selectedClientId: EditableClientId | undefined
  runtimeState: PopupState | undefined
  onCloseDetail: () => void
  onOpenDetail: (clientId: EditableClientId, detailTab?: ClientDetailTab) => void
  onRouteSearchChange: (value: string) => void
  onSelectClient: (clientId: EditableClientId) => void
  onChange: (config: ExtensionConfig) => void
  onCreateClient: (kind: 'background' | 'route') => void
  onCreateClientFromPage: () => void
}) {
  const { t } = useI18n()
  const [createMenuAnchor, setCreateMenuAnchor] = useState<HTMLElement | null>(null)
  const [clientTypeFilter, setClientTypeFilter] = useState<'all' | 'background' | 'route'>('all')
  const [selectedIds, setSelectedIds] = useState<EditableClientId[]>([])
  const backgroundRuntimeState = runtimeState?.clients.find((client) => client.kind === 'background')
  const currentPageUrl = runtimeState?.activeTab?.url
  const filteredClients = useMemo(() => {
    const needle = routeSearch.trim().toLowerCase()
    const routeItems = draft.routeClients
      .filter((client) => {
        if (!needle) {
          return true
        }

        const haystack = [
          client.clientName,
          client.clientId,
          client.matchPatterns.join(' '),
          client.skillEntries.map((skill) => skill.path).join(' ')
        ]
          .join(' ')
          .toLowerCase()

        return haystack.includes(needle)
      })
      .map((client) => ({
        kind: 'route' as const,
        id: client.id,
        client
      }))

    const backgroundMatches =
      !needle ||
      [
        'background',
        draft.backgroundClient.clientName,
        draft.backgroundClient.clientId,
        draft.backgroundClient.clientDescription
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle)

    const items = backgroundMatches
      ? [
          {
            kind: 'background' as const,
            id: 'background' as const,
            client: draft.backgroundClient
          },
          ...routeItems
        ]
      : routeItems

    return items
      .filter((item) => clientTypeFilter === 'all' || item.kind === clientTypeFilter)
      .sort((left, right) => {
        if (left.client.favorite !== right.client.favorite) {
          return left.client.favorite ? -1 : 1
        }

        if (left.kind !== right.kind) {
          return left.kind === 'background' ? -1 : 1
        }

        return left.client.clientName.localeCompare(right.client.clientName)
      })
  }, [clientTypeFilter, draft.backgroundClient, draft.routeClients, routeSearch])
  const selectedClientItem =
    filteredClients.find((item) => item.id === selectedClientId) ??
    filteredClients.find((item) => item.kind === 'route') ??
    filteredClients[0]

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => filteredClients.some((item) => item.id === id)))
  }, [filteredClients])

  function updateDraftClient(clientId: EditableClientId, updater: (current: BackgroundClientConfig | RouteClientConfig) => BackgroundClientConfig | RouteClientConfig) {
    if (clientId === 'background') {
      onChange({
        ...draft,
        backgroundClient: updater(draft.backgroundClient) as BackgroundClientConfig
      })
      return
    }

    onChange({
      ...draft,
      routeClients: draft.routeClients.map((client) =>
        client.id === clientId ? (updater(client) as RouteClientConfig) : client
      )
    })
  }

  function deleteClients(clientIds: EditableClientId[]) {
    const nextSelection = selectedClientId && clientIds.includes(selectedClientId) ? undefined : selectedClientId
    onChange({
      ...draft,
      routeClients: draft.routeClients.filter((client) => !clientIds.includes(client.id))
    })
    setSelectedIds((current) => current.filter((id) => !clientIds.includes(id)))
    if (nextSelection !== selectedClientId) {
      onSelectClient(draft.routeClients.find((client) => !clientIds.includes(client.id))?.id ?? 'background')
    }
  }

  function toggleSelected(clientId: EditableClientId, checked: boolean) {
    setSelectedIds((current) =>
      checked ? uniqueEditableIds([...current, clientId]) : current.filter((id) => id !== clientId)
    )
  }

  function applyBulk(action: 'enable' | 'disable' | 'favorite' | 'unfavorite' | 'delete') {
    if (selectedIds.length === 0) {
      return
    }

    if (action === 'delete') {
      deleteClients(selectedIds.filter((id) => id !== 'background'))
      return
    }

    const selectedSet = new Set(selectedIds)
    onChange({
      ...draft,
      backgroundClient: selectedSet.has('background')
        ? {
            ...draft.backgroundClient,
            ...(action === 'enable' ? { enabled: true } : {}),
            ...(action === 'disable' ? { enabled: false } : {}),
            ...(action === 'favorite' ? { favorite: true } : {}),
            ...(action === 'unfavorite' ? { favorite: false } : {})
          }
        : draft.backgroundClient,
      routeClients: draft.routeClients.map((client) =>
        selectedSet.has(client.id)
          ? {
              ...client,
              ...(action === 'enable' ? { enabled: true } : {}),
              ...(action === 'disable' ? { enabled: false } : {}),
              ...(action === 'favorite' ? { favorite: true } : {}),
              ...(action === 'unfavorite' ? { favorite: false } : {})
            }
          : client
      )
    })
  }

  const allVisibleSelected = filteredClients.length > 0 && filteredClients.every((item) => selectedIds.includes(item.id))
  const hasAnyRouteSelected = selectedIds.some((id) => id !== 'background')

  if (!clientDetailOpen) {
    return (
      <Stack spacing={1.25}>
        <Stack spacing={1} sx={{ px: 1.25, py: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <TextField
              fullWidth
              size="small"
              placeholder={t('options.clients.search')}
              value={routeSearch}
              onChange={(event) => onRouteSearchChange(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined fontSize="small" />
                  </InputAdornment>
                )
              }}
            />
            <Button
              variant="contained"
              onClick={(event) => setCreateMenuAnchor(event.currentTarget)}
              sx={{ minWidth: 40, px: 1.25 }}
            >
              <AddOutlined fontSize="small" />
            </Button>
          </Stack>
          <Menu
            anchorEl={createMenuAnchor}
            open={Boolean(createMenuAnchor)}
            onClose={() => setCreateMenuAnchor(null)}
          >
            <MenuItem
              onClick={() => {
                setCreateMenuAnchor(null)
                onCreateClient('route')
              }}
            >
              {t('options.clients.type.route')}
            </MenuItem>
            <MenuItem
              onClick={() => {
                setCreateMenuAnchor(null)
                onCreateClient('background')
              }}
            >
              {t('options.clients.type.background')}
            </MenuItem>
            <MenuItem
              disabled={!canCreateFromPage}
              onClick={() => {
                setCreateMenuAnchor(null)
                onCreateClientFromPage()
              }}
            >
              {t('options.clients.addFromPage')}
            </MenuItem>
          </Menu>

          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={clientTypeFilter}
              onChange={(_event, nextValue: 'all' | 'background' | 'route' | null) => {
                if (nextValue) {
                  setClientTypeFilter(nextValue)
                }
              }}
            >
              <ToggleButton value="all">{t('options.clients.filter.all')}</ToggleButton>
              <ToggleButton value="background">{t('options.clients.type.background')}</ToggleButton>
              <ToggleButton value="route">{t('options.clients.type.route')}</ToggleButton>
            </ToggleButtonGroup>
            {filteredClients.length > 0 ? (
              <Checkbox
                size="small"
                checked={allVisibleSelected}
                indeterminate={!allVisibleSelected && selectedIds.length > 0}
                onChange={(_event, checked) =>
                  setSelectedIds(checked ? filteredClients.map((item) => item.id) : [])
                }
              />
            ) : null}
          </Stack>

          {selectedIds.length > 0 ? (
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
              <Typography variant="caption" color="text.secondary">
                {t('options.clients.selected', { count: selectedIds.length })}
              </Typography>
              <Stack direction="row" spacing={0.5}>
                <ToolbarIcon label={t('options.clients.enable')} onClick={() => applyBulk('enable')}>
                  <WindowOutlined fontSize="small" />
                </ToolbarIcon>
                <ToolbarIcon label={t('options.clients.disable')} onClick={() => applyBulk('disable')}>
                  <DeleteOutlineOutlined fontSize="small" sx={{ transform: 'rotate(45deg)' }} />
                </ToolbarIcon>
                <ToolbarIcon label={t('options.clients.favorite')} onClick={() => applyBulk('favorite')}>
                  <StarOutlined fontSize="small" />
                </ToolbarIcon>
                <ToolbarIcon label={t('options.clients.unfavorite')} onClick={() => applyBulk('unfavorite')}>
                  <StarBorderOutlined fontSize="small" />
                </ToolbarIcon>
                <ToolbarIcon
                  label={t('options.clients.delete')}
                  onClick={() => applyBulk('delete')}
                  disabled={!hasAnyRouteSelected}
                >
                  <DeleteOutlineOutlined fontSize="small" />
                </ToolbarIcon>
              </Stack>
            </Stack>
          ) : null}
        </Stack>

        <Divider />

        <List dense disablePadding sx={{ px: 0.75, py: 0.5 }}>
          {filteredClients.length === 0 ? (
            <ListItem disablePadding sx={{ px: 1.25, py: 1.5 }}>
              <ListItemText
                primary={t('options.clients.emptySearch')}
                secondary={t('options.clients.emptySearchHint')}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ) : (
            filteredClients.map((item) => {
              const matched =
                item.kind === 'route'
                  ? Boolean(
                      currentPageUrl &&
                        canCreateRouteClientFromUrl(currentPageUrl) &&
                        matchesRouteClient(currentPageUrl, item.client)
                    )
                  : false
              const tone =
                item.kind === 'background'
                  ? backgroundRuntimeState?.connectionState === 'connected'
                    ? 'success.main'
                    : item.client.enabled
                      ? 'text.secondary'
                      : 'error.main'
                  : matched
                    ? 'success.main'
                    : item.client.enabled
                      ? 'text.secondary'
                      : 'error.main'
              return (
                <ListItem key={item.id} disablePadding>
                  <ListItemButton
                    selected={selectedClientId === item.id}
                    onClick={() => {
                      onSelectClient(item.id)
                      onOpenDetail(item.id)
                    }}
                    sx={{
                      minHeight: 60,
                      px: 1.25,
                      py: 0.75,
                      alignItems: 'center',
                      borderLeft: '2px solid',
                      borderLeftColor: selectedClientItem?.id === item.id ? 'primary.main' : 'transparent'
                    }}
                  >
                    <Checkbox
                      edge="start"
                      size="small"
                      checked={selectedIds.includes(item.id)}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(_event, checked) => toggleSelected(item.id, checked)}
                      sx={{ mr: 0.5 }}
                    />
                    <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}>
                      {renderClientIcon(item.client.icon)}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.client.clientName}
                      secondary={item.kind === 'background' ? t('options.clients.type.background') : t('options.clients.type.route')}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
                      secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                    />
                    <Stack direction="row" spacing={0.25} sx={{ pl: 1 }} onClick={(event) => event.stopPropagation()}>
                      <ToolbarIcon
                        label={item.client.favorite ? t('options.clients.unfavorite') : t('options.clients.favorite')}
                        onClick={() =>
                          updateDraftClient(item.id, (client) => ({
                            ...client,
                            favorite: !client.favorite
                          }))
                        }
                      >
                        {item.client.favorite ? <StarOutlined fontSize="small" /> : <StarBorderOutlined fontSize="small" />}
                      </ToolbarIcon>
                      <Switch
                        size="small"
                        checked={item.client.enabled}
                        onChange={(_event, checked) =>
                          updateDraftClient(item.id, (client) => ({
                            ...client,
                            enabled: checked
                          }))
                        }
                      />
                      {item.kind === 'route' ? (
                        <ToolbarIcon
                          label={t('options.clients.delete')}
                          onClick={() => deleteClients([item.id])}
                        >
                          <DeleteOutlineOutlined fontSize="small" />
                        </ToolbarIcon>
                      ) : null}
                    </Stack>
                  </ListItemButton>
                </ListItem>
              )
            })
          )}
        </List>
      </Stack>
    )
  }

  return (
    <Stack spacing={1.25}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ px: 0.25, py: 0.25 }}
      >
        <Button size="small" variant="text" onClick={onCloseDetail} sx={{ px: 0 }}>
          {t('options.clients.backToList')}
        </Button>
        {selectedClientItem ? (
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
            {selectedClientItem.client.clientName}
          </Typography>
        ) : null}
      </Stack>

      {selectedClientItem ? (
        selectedClientItem.kind === 'background' ? (
          <BackgroundClientEditor
            client={selectedClientItem.client}
            draft={draft}
            runtimeState={backgroundRuntimeState?.connectionState}
            onChange={onChange}
          />
        ) : (
          <ClientEditor
            client={selectedClientItem.client}
            draft={draft}
            currentPageUrl={currentPageUrl}
            initialAssetTab={initialAssetTab}
            initialTab={initialDetailTab}
            onChange={onChange}
          />
        )
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t('options.clients.empty')}
        </Typography>
      )}
    </Stack>
  )
}

function BackgroundClientEditor({
  client,
  draft,
  runtimeState,
  onChange
}: {
  client: BackgroundClientConfig
  draft: ExtensionConfig
  runtimeState: PopupState['clients'][number]['connectionState'] | undefined
  onChange: (config: ExtensionConfig) => void
}) {
  const { t } = useI18n()
  const [tab, setTab] = useState<'basics' | 'assets'>('basics')

  function updateClient(next: BackgroundClientConfig) {
    onChange({
      ...draft,
      backgroundClient: next
    })
  }

  return (
    <Stack spacing={1.25}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={0.75}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
      >
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ color: runtimeState === 'connected' ? 'success.main' : 'text.secondary', fontWeight: 600 }}>
            {runtimeState ? t(`connection.${runtimeState}`) : client.enabled ? t('options.clients.idle') : t('options.clients.off')}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {t('options.clients.backgroundSummary')}
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {[t('popup.ability.tools', { count: BACKGROUND_BUILT_IN_TOOLS.length }), t('popup.ability.resources', { count: BACKGROUND_BUILT_IN_RESOURCES.length }), t('popup.ability.skills', { count: 0 })].join(' · ')}
        </Typography>
      </Stack>
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_event, next) => setTab(next)} variant="scrollable" scrollButtons={false}>
          <Tab value="basics" label={t('options.clients.tab.basics')} />
          <Tab value="assets" label={t('options.clients.tab.assets')} />
        </Tabs>
      </Box>

      {tab === 'basics' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
          <FormControlLabel
            control={
              <Switch
                checked={client.enabled}
                onChange={(_, checked) => updateClient({ ...client, enabled: checked })}
              />
            }
            label={t('common.enabled')}
          />
          <TextField size="small" label={t('options.clients.type')} value={t('options.clients.type.background')} disabled />
          <IconPicker label={t('common.icon')} value={client.icon} onChange={(icon) => updateClient({ ...client, icon })} />
          <TextField
            size="small"
            label={t('common.clientName')}
            value={client.clientName}
            onChange={(event) => updateClient({ ...client, clientName: event.target.value })}
          />
          <TextField
            size="small"
            label={t('common.clientId')}
            value={client.clientId}
            onChange={(event) => updateClient({ ...client, clientId: event.target.value })}
          />
          <TextField
            size="small"
            label={t('common.description')}
            value={client.clientDescription}
            onChange={(event) => updateClient({ ...client, clientDescription: event.target.value })}
            multiline
            minRows={3}
            sx={{ gridColumn: '1 / -1' }}
          />
        </Box>
      ) : (
        <Stack spacing={1.25}>
          <Typography variant="body2" color="text.secondary">
            {t('options.clients.backgroundAssetsDescription')}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1fr)' }, gap: 1.25 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2">{t('options.clients.backgroundTools')}</Typography>
              <List dense disablePadding>
                {BACKGROUND_BUILT_IN_TOOLS.map((toolName) => (
                  <ListItem key={toolName} disablePadding sx={{ py: 0.25 }}>
                    <ListItemText
                      primary={toolName}
                      primaryTypographyProps={{ variant: 'body2', fontFamily: 'monospace' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Stack>
            <Stack spacing={1}>
              <Typography variant="subtitle2">{t('options.clients.backgroundResources')}</Typography>
              <List dense disablePadding>
                {BACKGROUND_BUILT_IN_RESOURCES.map((resourceUri) => (
                  <ListItem key={resourceUri} disablePadding sx={{ py: 0.25 }}>
                    <ListItemText
                      primary={resourceUri}
                      primaryTypographyProps={{ variant: 'body2', fontFamily: 'monospace' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Stack>
          </Box>
        </Stack>
      )}
    </Stack>
  )
}

function ClientEditor({
  client,
  currentPageUrl,
  draft,
  initialAssetTab,
  initialTab,
  onChange
}: {
  client: RouteClientConfig
  currentPageUrl: string | undefined
  draft: ExtensionConfig
  initialAssetTab: OptionsAssetsTab | undefined
  initialTab: ClientDetailTab | undefined
  onChange: (config: ExtensionConfig) => void
}) {
  const { t } = useI18n()
  const [tab, setTab] = useState<ClientDetailTab>(initialTab ?? 'basics')
  const matched = Boolean(
    currentPageUrl && canCreateRouteClientFromUrl(currentPageUrl) && matchesRouteClient(currentPageUrl, client)
  )
  const currentPageLabel = formatSurfaceUrlLabel(currentPageUrl)

  useEffect(() => {
    setTab(initialTab ?? 'basics')
  }, [initialTab, client.id])

  function updateClient(next: RouteClientConfig) {
    onChange({
      ...draft,
      routeClients: draft.routeClients.map((item) => (item.id === client.id ? next : item))
    })
  }

  return (
    <Stack spacing={1.25}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={0.75}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
      >
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ color: matched ? 'success.main' : 'text.secondary', fontWeight: 600 }}>
            {matched ? t('options.clients.match') : client.enabled ? t('options.clients.idle') : t('options.clients.off')}
          </Typography>
          {currentPageLabel ? (
            <Typography variant="caption" color="text.secondary" noWrap>
              {currentPageLabel}
            </Typography>
          ) : null}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {[t('options.clients.flows', { count: client.recordings.length }), t('options.clients.resources', { count: client.selectorResources.length }), t('options.clients.skills', { count: client.skillEntries.length })].join(' · ')}
        </Typography>
      </Stack>
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_event, next) => setTab(next)} variant="scrollable" scrollButtons={false}>
          <Tab value="basics" label={t('options.clients.tab.basics')} />
          <Tab value="matching" label={t('options.clients.tab.matching')} />
          <Tab value="runtime" label={t('options.clients.tab.runtime')} />
          <Tab value="assets" label={t('options.clients.tab.assets')} />
        </Tabs>
      </Box>

      {tab === 'basics' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
          <FormControlLabel
            control={<Switch checked={client.enabled} onChange={(_, checked) => updateClient({ ...client, enabled: checked })} />}
            label={t('common.enabled')}
          />
          <TextField size="small" label={t('options.clients.type')} value={t('options.clients.type.route')} disabled />
          <IconPicker
            label={t('common.icon')}
            value={client.icon}
            onChange={(icon) => updateClient({ ...client, icon })}
          />
          <TextField
            size="small"
            label={t('common.clientName')}
            value={client.clientName}
            onChange={(event) => updateClient({ ...client, clientName: event.target.value })}
          />
          <TextField
            size="small"
            label={t('common.clientId')}
            value={client.clientId}
            onChange={(event) => updateClient({ ...client, clientId: event.target.value })}
          />
          <TextField
            size="small"
            label={t('common.description')}
            multiline
            minRows={3}
            value={client.clientDescription}
            onChange={(event) => updateClient({ ...client, clientDescription: event.target.value })}
            sx={{ gridColumn: '1 / -1' }}
          />
        </Box>
      ) : null}

      {tab === 'matching' ? (
        <Stack spacing={1.25}>
          <TextField
            size="small"
            label={t('options.clients.matchPatterns')}
            multiline
            minRows={3}
            helperText={t('options.clients.matchPatternsHelp')}
            value={stringifyMatchPatterns(client.matchPatterns)}
            onChange={(event) =>
              updateClient({
                ...client,
                matchPatterns: event.target.value
                  .split(/\r?\n/g)
                  .map((value) => value.trim())
                  .filter(Boolean)
              })
            }
          />

          <Divider />

          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle2">{t('options.clients.pathRules')}</Typography>
              <ToolbarIcon
                label={t('options.clients.addRule')}
                onClick={() =>
                  updateClient({
                    ...client,
                    routeRules: [...client.routeRules, { id: `rule-${Date.now()}`, mode: 'pathname-prefix', value: '/' }]
                  })
                }
              >
                <AddOutlined fontSize="small" />
              </ToolbarIcon>
            </Stack>
            {client.routeRules.map((rule) => (
              <Box key={rule.id} sx={{ display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr) auto', gap: 1, alignItems: 'center' }}>
                <TextField
                  size="small"
                  select
                  value={rule.mode}
                  onChange={(event) =>
                    updateClient({
                      ...client,
                      routeRules: client.routeRules.map((item) =>
                        item.id === rule.id ? { ...item, mode: event.target.value as typeof item.mode } : item
                      )
                    })
                  }
                >
                  <MenuItem value="pathname-prefix">{t('options.clients.rule.pathname-prefix')}</MenuItem>
                  <MenuItem value="pathname-exact">{t('options.clients.rule.pathname-exact')}</MenuItem>
                  <MenuItem value="url-contains">{t('options.clients.rule.url-contains')}</MenuItem>
                  <MenuItem value="regex">{t('options.clients.rule.regex')}</MenuItem>
                </TextField>
                <TextField
                  size="small"
                  value={rule.value}
                  onChange={(event) =>
                    updateClient({
                      ...client,
                      routeRules: client.routeRules.map((item) =>
                        item.id === rule.id ? { ...item, value: event.target.value } : item
                      )
                    })
                  }
                />
                <ToolbarIcon
                  label={t('options.clients.removeRule')}
                  onClick={() =>
                    updateClient({
                      ...client,
                      routeRules: client.routeRules.filter((item) => item.id !== rule.id)
                    })
                  }
                >
                  <DeleteOutlineOutlined fontSize="small" />
                </ToolbarIcon>
              </Box>
            ))}
          </Stack>
        </Stack>
      ) : null}

      {tab === 'runtime' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1.25 }}>
          <FormControlLabel
            control={
              <Switch checked={client.autoInjectBridge} onChange={(_, checked) => updateClient({ ...client, autoInjectBridge: checked })} />
            }
            label={t('options.clients.autoInjectBridge')}
          />
          <TextField
            size="small"
            label={t('options.clients.defaultToolScript')}
            multiline
            minRows={9}
            value={client.toolScriptSource}
            onChange={(event) => updateClient({ ...client, toolScriptSource: event.target.value })}
          />
        </Box>
      ) : null}

      {tab === 'assets' ? (
        <ClientAssetsPanel
          client={client}
          draft={draft}
          initialTab={initialAssetTab}
          onChange={onChange}
        />
      ) : null}
    </Stack>
  )
}

function ClientAssetsPanel({
  client,
  draft,
  initialTab,
  onChange
}: {
  client: RouteClientConfig
  draft: ExtensionConfig
  initialTab: OptionsAssetsTab | undefined
  onChange: (config: ExtensionConfig) => void
}) {
  const { t } = useI18n()
  const [tab, setTab] = useState<'flows' | 'resources' | 'skills'>('flows')
  const [selectedFlowId, setSelectedFlowId] = useState<string>()
  const [selectedResourceId, setSelectedResourceId] = useState<string>()
  const [selectedSkillId, setSelectedSkillId] = useState<string>()

  function updateClient(next: RouteClientConfig) {
    onChange({
      ...draft,
      routeClients: draft.routeClients.map((client) => (client.id === next.id ? next : client))
    })
  }

  useEffect(() => {
    setTab(initialTab ?? 'flows')
  }, [initialTab, client.id])

  useEffect(() => {
    setSelectedFlowId((current) =>
      current && client.recordings.some((recording) => recording.id === current)
        ? current
        : client.recordings[0]?.id
    )
  }, [client.id, client.recordings])

  useEffect(() => {
    setSelectedResourceId((current) =>
      current && client.selectorResources.some((resource) => resource.id === current)
        ? current
        : client.selectorResources[0]?.id
    )
  }, [client.id, client.selectorResources])

  useEffect(() => {
    setSelectedSkillId((current) =>
      current && client.skillEntries.some((skill) => skill.id === current)
        ? current
        : client.skillEntries[0]?.id
    )
  }, [client.id, client.skillEntries])

  const selectedFlow = client.recordings.find((recording) => recording.id === selectedFlowId) ?? client.recordings[0]
  const selectedResource =
    client.selectorResources.find((resource) => resource.id === selectedResourceId) ?? client.selectorResources[0]
  const selectedSkill =
    client.skillEntries.find((skill) => skill.id === selectedSkillId) ?? client.skillEntries[0]

  function addResource() {
    const nextResource: RouteClientConfig['selectorResources'][number] = {
      id: createLocalId('resource'),
      name: t('options.assets.resources.newName'),
      description: '',
      createdAt: new Date().toISOString(),
      selector: '',
      alternativeSelectors: [],
      tagName: '',
      classes: [],
      attributes: {}
    }

    updateClient({
      ...client,
      selectorResources: [...client.selectorResources, nextResource]
    })
    setTab('resources')
    setSelectedResourceId(nextResource.id)
  }

  function addSkill() {
    const nextSkill: RouteClientConfig['skillEntries'][number] = {
      id: createLocalId('skill'),
      path: '',
      title: t('options.assets.skills.newTitle'),
      summary: '',
      icon: 'spark' as ClientIconKey,
      content: ''
    }

    updateClient({
      ...client,
      skillEntries: [...client.skillEntries, nextSkill]
    })
    setTab('skills')
    setSelectedSkillId(nextSkill.id)
  }

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {t('options.assets.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('options.assets.description')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          {tab === 'resources' ? (
            <ToolbarIcon label={t('options.assets.addResource')} onClick={addResource}>
              <AddOutlined fontSize="small" />
            </ToolbarIcon>
          ) : null}
          {tab === 'skills' ? (
            <ToolbarIcon label={t('options.assets.addSkill')} onClick={addSkill}>
              <AddOutlined fontSize="small" />
            </ToolbarIcon>
          ) : null}
        </Stack>
      </Stack>
      <Stack spacing={1.25}>
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_event, next) => setTab(next)} variant="scrollable" scrollButtons={false}>
            <Tab value="flows" label={t('options.assets.tab.flows', { count: client.recordings.length })} />
            <Tab
              value="resources"
              label={t('options.assets.tab.resources', { count: client.selectorResources.length })}
            />
            <Tab value="skills" label={t('options.assets.tab.skills', { count: client.skillEntries.length })} />
          </Tabs>
        </Box>

        {tab === 'flows' ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '260px minmax(0, 1fr)' }, gap: 1.25 }}>
            <List dense disablePadding sx={{ borderRight: { lg: '1px solid' }, borderColor: 'divider', pr: { lg: 1.25 } }}>
              {client.recordings.length === 0 ? (
                <ListItem disablePadding sx={{ py: 1 }}>
                  <ListItemText
                    primary={t('options.assets.flows.empty')}
                    primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                  />
                </ListItem>
              ) : (
                client.recordings.map((recording) => (
                  <ListItem key={recording.id} disablePadding>
                    <ListItemButton selected={selectedFlow?.id === recording.id} onClick={() => setSelectedFlowId(recording.id)}>
                      <ListItemText
                        primary={recording.name}
                        secondary={t('options.assets.flows.steps', { count: recording.steps.length })}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))
              )}
            </List>

            {selectedFlow ? (
              <Stack spacing={1.25}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 1, alignItems: 'start' }}>
                  <TextField
                    size="small"
                    label={t('options.assets.flows.name')}
                    value={selectedFlow.name}
                    onChange={(event) =>
                      updateClient({
                        ...client,
                        recordings: client.recordings.map((item) =>
                          item.id === selectedFlow.id ? { ...item, name: event.target.value } : item
                        )
                      })
                    }
                  />
                  <ToolbarIcon
                    label={t('options.assets.deleteItem')}
                    onClick={() =>
                      updateClient({
                        ...client,
                        recordings: client.recordings.filter((item) => item.id !== selectedFlow.id)
                      })
                    }
                  >
                    <DeleteOutlineOutlined fontSize="small" />
                  </ToolbarIcon>
                </Box>
                <TextField
                  size="small"
                  label={t('common.description')}
                  value={selectedFlow.description}
                  onChange={(event) =>
                    updateClient({
                      ...client,
                      recordings: client.recordings.map((item) =>
                        item.id === selectedFlow.id ? { ...item, description: event.target.value } : item
                      )
                    })
                  }
                />
                <Typography variant="caption" color="text.secondary">
                  {[
                    t('options.assets.flows.steps', { count: selectedFlow.steps.length }),
                    selectedFlow.startUrl ? `${t('options.assets.flows.startUrl')}: ${formatSurfaceUrlLabel(selectedFlow.startUrl)}` : undefined,
                    selectedFlow.capturedFeatures.length
                      ? `${t('options.assets.flows.features')}: ${selectedFlow.capturedFeatures.length}`
                      : undefined
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Typography>
              </Stack>
            ) : null}
          </Box>
        ) : null}

        {tab === 'resources' ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '260px minmax(0, 1fr)' }, gap: 1.25 }}>
            <List dense disablePadding sx={{ borderRight: { lg: '1px solid' }, borderColor: 'divider', pr: { lg: 1.25 } }}>
              {client.selectorResources.length === 0 ? (
                <ListItem disablePadding sx={{ py: 1 }}>
                  <ListItemText
                    primary={t('options.assets.resources.empty')}
                    primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                  />
                </ListItem>
              ) : (
                client.selectorResources.map((resource) => (
                  <ListItem key={resource.id} disablePadding>
                    <ListItemButton selected={selectedResource?.id === resource.id} onClick={() => setSelectedResourceId(resource.id)}>
                      <ListItemText
                        primary={resource.name}
                        secondary={resource.selector || t('options.assets.resources.selector')}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
                        secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))
              )}
            </List>

            {selectedResource ? (
              <Stack spacing={1.25}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 1, alignItems: 'start' }}>
                  <TextField
                    size="small"
                    label={t('options.assets.resources.name')}
                    value={selectedResource.name}
                    onChange={(event) =>
                      updateClient({
                        ...client,
                        selectorResources: client.selectorResources.map((item) =>
                          item.id === selectedResource.id ? { ...item, name: event.target.value } : item
                        )
                      })
                    }
                  />
                  <ToolbarIcon
                    label={t('options.assets.deleteItem')}
                    onClick={() =>
                      updateClient({
                        ...client,
                        selectorResources: client.selectorResources.filter((item) => item.id !== selectedResource.id)
                      })
                    }
                  >
                    <DeleteOutlineOutlined fontSize="small" />
                  </ToolbarIcon>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
                  <TextField
                    size="small"
                    label={t('options.assets.resources.selector')}
                    value={selectedResource.selector}
                    onChange={(event) =>
                      updateClient({
                        ...client,
                        selectorResources: client.selectorResources.map((item) =>
                          item.id === selectedResource.id ? { ...item, selector: event.target.value } : item
                        )
                      })
                    }
                  />
                  <TextField
                    size="small"
                    label={t('options.assets.resources.tagName')}
                    value={selectedResource.tagName}
                    onChange={(event) =>
                      updateClient({
                        ...client,
                        selectorResources: client.selectorResources.map((item) =>
                          item.id === selectedResource.id ? { ...item, tagName: event.target.value } : item
                        )
                      })
                    }
                  />
                </Box>
                <TextField
                  size="small"
                  label={t('common.description')}
                  value={selectedResource.description}
                  onChange={(event) =>
                      updateClient({
                        ...client,
                        selectorResources: client.selectorResources.map((item) =>
                          item.id === selectedResource.id ? { ...item, description: event.target.value } : item
                        )
                      })
                  }
                />
                <TextField
                  size="small"
                  label={t('options.assets.resources.text')}
                  value={selectedResource.text ?? ''}
                  onChange={(event) =>
                      updateClient({
                        ...client,
                        selectorResources: client.selectorResources.map((item) =>
                          item.id === selectedResource.id ? { ...item, text: event.target.value || undefined } : item
                        )
                      })
                  }
                />
                <TextField
                  size="small"
                  label={t('options.assets.resources.alternativeSelectors')}
                  multiline
                  minRows={3}
                  value={selectedResource.alternativeSelectors.join('\n')}
                  onChange={(event) =>
                      updateClient({
                        ...client,
                        selectorResources: client.selectorResources.map((item) =>
                          item.id === selectedResource.id
                          ? {
                              ...item,
                              alternativeSelectors: event.target.value
                                .split(/\r?\n/g)
                                .map((value) => value.trim())
                                .filter(Boolean)
                            }
                          : item
                      )
                    })
                  }
                />
                <TextField
                  size="small"
                  label={t('options.assets.resources.classes')}
                  value={selectedResource.classes.join(', ')}
                  onChange={(event) =>
                      updateClient({
                        ...client,
                        selectorResources: client.selectorResources.map((item) =>
                          item.id === selectedResource.id
                          ? {
                              ...item,
                              classes: event.target.value
                                .split(',')
                                .map((value) => value.trim())
                                .filter(Boolean)
                            }
                          : item
                      )
                    })
                  }
                />
              </Stack>
            ) : null}
          </Box>
        ) : null}

        {tab === 'skills' ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '260px minmax(0, 1fr)' }, gap: 1.25 }}>
            <List dense disablePadding sx={{ borderRight: { lg: '1px solid' }, borderColor: 'divider', pr: { lg: 1.25 } }}>
              {client.skillEntries.length === 0 ? (
                <ListItem disablePadding sx={{ py: 1 }}>
                  <ListItemText
                    primary={t('options.assets.skills.empty')}
                    primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                  />
                </ListItem>
              ) : (
                client.skillEntries.map((skill) => (
                  <ListItem key={skill.id} disablePadding>
                    <ListItemButton selected={selectedSkill?.id === skill.id} onClick={() => setSelectedSkillId(skill.id)}>
                      <ListItemText
                        primary={skill.title || skill.path || t('options.assets.skills.newTitle')}
                        secondary={skill.path || t('options.assets.skills.path')}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
                        secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))
              )}
            </List>

            {selectedSkill ? (
              <Stack spacing={1.25}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 1, alignItems: 'start' }}>
                  <TextField
                    size="small"
                    label={t('options.assets.skills.titleField')}
                    value={selectedSkill.title}
                    onChange={(event) =>
                      updateClient({
                        ...client,
                        skillEntries: client.skillEntries.map((item) =>
                          item.id === selectedSkill.id ? { ...item, title: event.target.value } : item
                        )
                      })
                    }
                  />
                  <ToolbarIcon
                    label={t('options.assets.deleteItem')}
                    onClick={() =>
                      updateClient({
                        ...client,
                        skillEntries: client.skillEntries.filter((item) => item.id !== selectedSkill.id)
                      })
                    }
                  >
                    <DeleteOutlineOutlined fontSize="small" />
                  </ToolbarIcon>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 180px', gap: 1 }}>
                  <TextField
                    size="small"
                    label={t('options.assets.skills.path')}
                    value={selectedSkill.path}
                    onChange={(event) =>
                      updateClient({
                        ...client,
                        skillEntries: client.skillEntries.map((item) =>
                          item.id === selectedSkill.id ? { ...item, path: event.target.value } : item
                        )
                      })
                    }
                  />
                  <IconPicker
                    label={t('common.icon')}
                    value={selectedSkill.icon}
                    onChange={(icon) =>
                      updateClient({
                        ...client,
                        skillEntries: client.skillEntries.map((item) =>
                          item.id === selectedSkill.id ? { ...item, icon } : item
                        )
                      })
                    }
                  />
                </Box>
                <TextField
                  size="small"
                  label={t('common.summary')}
                  value={selectedSkill.summary}
                  onChange={(event) =>
                      updateClient({
                        ...client,
                        skillEntries: client.skillEntries.map((item) =>
                          item.id === selectedSkill.id ? { ...item, summary: event.target.value } : item
                        )
                      })
                  }
                />
                <TextField
                  size="small"
                  label={t('options.assets.skills.content')}
                  multiline
                  minRows={10}
                  value={selectedSkill.content}
                  onChange={(event) =>
                      updateClient({
                        ...client,
                        skillEntries: client.skillEntries.map((item) =>
                          item.id === selectedSkill.id ? { ...item, content: event.target.value } : item
                        )
                      })
                  }
                />
              </Stack>
            ) : null}
          </Box>
        ) : null}
      </Stack>
    </Stack>
  )
}

function MarketSection({
  marketDetailOpen,
  marketSources,
  marketUpdates,
  routeClients,
  selectedEntryKey,
  onAddSource,
  onCloseDetail,
  onOpenDetail,
  onInstall,
  onRemoveSource
}: {
  marketDetailOpen: boolean
  marketSources: MarketSourceConfig[]
  marketUpdates?: PopupState['marketUpdates']
  routeClients: RouteClientConfig[]
  selectedEntryKey?: string
  onAddSource: (input: MarketSourceDraftInput) => Promise<void>
  onCloseDetail: () => void
  onOpenDetail: (entryKey: string) => void
  onInstall: (catalog: MarketCatalogSourceData, entry: MarketCatalogClientEntry) => void
  onRemoveSource: (sourceId: string) => void
}) {
  const { t } = useI18n()
  const [sourceMode, setSourceMode] = useState<'direct' | 'repository'>('direct')
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceProvider, setSourceProvider] = useState<MarketSourceProvider>('github')
  const [sourceRepository, setSourceRepository] = useState('')
  const [sourceRefType, setSourceRefType] = useState<MarketSourceRefType>('branch')
  const [sourceRef, setSourceRef] = useState('main')
  const [editingSourceId, setEditingSourceId] = useState<string>()
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [catalogs, setCatalogs] = useState<MarketCatalogSourceResult[]>([])
  const [loadingCatalogs, setLoadingCatalogs] = useState(false)

  async function submitSource() {
    if (sourceMode === 'direct') {
      const nextUrl = sourceUrl.trim()

      if (!nextUrl) {
        return
      }

      await onAddSource({
        ...(editingSourceId ? { sourceId: editingSourceId } : {}),
        mode: 'direct',
        url: nextUrl
      })
      setSourceUrl('')
      setEditingSourceId(undefined)
      return
    }

    if (!sourceRepository.trim() || !sourceRef.trim()) {
      return
    }

    await onAddSource({
      ...(editingSourceId ? { sourceId: editingSourceId } : {}),
      mode: 'repository',
      provider: sourceProvider,
      repository: sourceRepository,
      refType: sourceRefType,
      ref: sourceRef
    })
    setSourceRepository('')
    setSourceRef('main')
    setEditingSourceId(undefined)
  }

  function resetSourceEditor() {
    setEditingSourceId(undefined)
    setSourceMode('direct')
    setSourceUrl('')
    setSourceProvider('github')
    setSourceRepository('')
    setSourceRefType('branch')
    setSourceRef('main')
  }

  function startEditingSource(source: MarketSourceConfig) {
    setEditingSourceId(source.id)
    if (source.kind === 'repository' && source.provider && source.repository && source.refType && source.ref) {
      setSourceMode('repository')
      setSourceProvider(source.provider)
      setSourceRepository(source.repository)
      setSourceRefType(source.refType)
      setSourceRef(source.ref)
      setSourceUrl('')
      return
    }

    setSourceMode('direct')
    setSourceUrl(source.url)
    setSourceProvider('github')
    setSourceRepository('')
    setSourceRefType('branch')
    setSourceRef('main')
  }

  useEffect(() => {
    let cancelled = false

    async function loadCatalogs() {
      if (marketSources.length === 0) {
        setCatalogs([])
        return
      }

      setLoadingCatalogs(true)

      try {
        const nextCatalogs = await Promise.all(marketSources.map((source) => fetchMarketCatalog(source)))

        if (!cancelled) {
          setCatalogs(nextCatalogs)
        }
      } finally {
        if (!cancelled) {
          setLoadingCatalogs(false)
        }
      }
    }

    void loadCatalogs()

    return () => {
      cancelled = true
    }
  }, [marketSources, refreshKey])

  const marketEntries = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return catalogs
      .flatMap((catalog) =>
        catalog.clients.map((entry) => {
          const localCount = countInstalledMarketClients(routeClients, catalog.source.url, entry.id)
          const haystack = [
            entry.title,
            entry.summary,
            catalog.title,
            catalog.source.url,
            ...entry.tags
          ]
            .join(' ')
            .toLowerCase()

          return {
            key: `${catalog.source.id}:${entry.id}`,
            catalog,
            entry,
            localCount,
            visible: keyword.length === 0 || haystack.includes(keyword)
          }
        })
      )
      .filter((item) => item.visible)
  }, [catalogs, routeClients, search])

  const selectedMarketEntry = marketEntries.find((item) => item.key === selectedEntryKey) ?? marketEntries[0]
  const sourceSummaries = useMemo(
    () =>
      marketSources.map((source) => {
        const matchedCatalog = catalogs.find((catalog) => catalog.source.id === source.id)

        return (
          matchedCatalog ?? {
            source,
            title: source.url,
            version: '',
            compatible: true,
            clients: []
          }
        )
      }),
    [catalogs, marketSources]
  )

  return (
    <SectionPanel
      title={t('options.market.title')}
      description={t('options.market.description')}
      icon={<StorefrontOutlined fontSize="small" />}
    >
      <Stack spacing={2}>
        <Stack spacing={1.25}>
          {marketUpdates?.pendingUpdateCount ? (
            <InlineStatus
              tone="info"
              message={t('options.market.pendingUpdates', { count: marketUpdates.pendingUpdateCount })}
            />
          ) : null}

          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              fullWidth
              size="small"
              placeholder={t('options.market.search')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined fontSize="small" />
                  </InputAdornment>
                )
              }}
            />
            <ToolbarIcon label={t('options.nav.settings')} onClick={() => setSettingsOpen(true)}>
              <SettingsOutlined fontSize="small" />
            </ToolbarIcon>
          </Stack>

          {marketDetailOpen ? (
            selectedMarketEntry ? (
              <Stack spacing={1.25}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Button size="small" variant="text" onClick={onCloseDetail} sx={{ px: 0 }}>
                    {t('options.clients.backToList')}
                  </Button>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                    {selectedMarketEntry.entry.title}
                  </Typography>
                </Stack>

                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    <Box sx={{ color: 'primary.main', display: 'grid', placeItems: 'center' }}>
                      {renderClientIcon(selectedMarketEntry.entry.icon)}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" color="text.secondary">
                        {selectedMarketEntry.entry.summary || t('options.market.noSummary')}
                      </Typography>
                    </Box>
                  </Stack>
                  <Button
                    variant="contained"
                    onClick={() => onInstall(selectedMarketEntry.catalog, selectedMarketEntry.entry)}
                  >
                    {selectedMarketEntry.localCount > 0 ? t('options.market.installAgain') : t('options.market.install')}
                  </Button>
                </Stack>

                <Stack spacing={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    {t('options.market.source')}
                  </Typography>
                  <Typography variant="body2">{selectedMarketEntry.catalog.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {[
                      `${t('options.market.version')}: ${selectedMarketEntry.catalog.version}`,
                      t('options.market.relatedLocalClients', { count: selectedMarketEntry.localCount })
                    ].join(' · ')}
                  </Typography>
                </Stack>

                <Divider />

                <Stack spacing={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    {t('options.market.previewClient')}
                  </Typography>
                  <Typography variant="body2">{selectedMarketEntry.entry.template.clientName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedMarketEntry.entry.template.clientDescription || t('options.market.noSummary')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {[
                      `${t('common.clientId')}: ${selectedMarketEntry.entry.template.clientId}`,
                      `${t('options.market.matching')}: ${selectedMarketEntry.entry.template.matchPatterns[0] ?? t('options.clients.noHostPattern')}`,
                      t('options.market.pathRules', { count: selectedMarketEntry.entry.template.routeRules.length })
                    ].join(' · ')}
                  </Typography>
                </Stack>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('options.market.noSelection')}
              </Typography>
            )
          ) : (
            <Stack spacing={0.5}>
              <Typography variant="subtitle2">{t('options.market.results')}</Typography>
              {loadingCatalogs ? (
                <Typography variant="body2" color="text.secondary">
                  {t('options.loadingWorkspace')}
                </Typography>
              ) : marketEntries.length === 0 ? (
                <Stack spacing={0.25}>
                  <Typography variant="body2" color="text.secondary">
                    {t('options.market.emptyResults')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('options.market.emptyResultsHint')}
                  </Typography>
                </Stack>
              ) : (
                <List disablePadding>
                  {marketEntries.map((item) => (
                    <ListItem key={item.key} disablePadding>
                      <ListItemButton onClick={() => onOpenDetail(item.key)}>
                        <ListItemIcon sx={{ minWidth: 34 }}>{renderClientIcon(item.entry.icon)}</ListItemIcon>
                        <ListItemText
                          primary={item.entry.title}
                          secondary={[
                            item.catalog.title,
                            t('options.market.localClients', { count: item.localCount })
                          ].join(' · ')}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
                          secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </Stack>
          )}
        </Stack>
      </Stack>

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('options.market.sources')}
          </Typography>
          <Stack direction="row" spacing={0.5}>
            <ToolbarIcon label={t('options.market.refreshSources')} onClick={() => setRefreshKey((value) => value + 1)}>
              <RefreshOutlined fontSize="small" />
            </ToolbarIcon>
            <ToolbarIcon label={t('common.close')} onClick={() => setSettingsOpen(false)}>
              <CloseOutlined fontSize="small" />
            </ToolbarIcon>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.25}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={sourceMode}
              onChange={(_event, nextValue: 'direct' | 'repository' | null) => {
                if (nextValue) {
                  setSourceMode(nextValue)
                }
              }}
            >
              <ToggleButton value="direct">{t('options.market.sourceMode.direct')}</ToggleButton>
              <ToggleButton value="repository">{t('options.market.sourceMode.repository')}</ToggleButton>
            </ToggleButtonGroup>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
              {sourceMode === 'direct' ? (
                <TextField
                  fullWidth
                  size="small"
                  label={t('options.market.sourceUrl')}
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void submitSource()
                    }
                  }}
                />
              ) : (
                <>
                  <TextField
                    select
                    size="small"
                    label={t('options.market.provider')}
                    value={sourceProvider}
                    onChange={(event) => setSourceProvider(event.target.value as MarketSourceProvider)}
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="github">GitHub</MenuItem>
                    <MenuItem value="gitlab">GitLab</MenuItem>
                  </TextField>
                  <TextField
                    fullWidth
                    size="small"
                    label={t('options.market.repository')}
                    value={sourceRepository}
                    onChange={(event) => setSourceRepository(event.target.value)}
                  />
                  <TextField
                    select
                    size="small"
                    label={t('options.market.refType')}
                    value={sourceRefType}
                    onChange={(event) => setSourceRefType(event.target.value as MarketSourceRefType)}
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="branch">{t('options.market.refType.branch')}</MenuItem>
                    <MenuItem value="tag">{t('options.market.refType.tag')}</MenuItem>
                    <MenuItem value="commit">{t('options.market.refType.commit')}</MenuItem>
                  </TextField>
                  <TextField
                    size="small"
                    label={t('options.market.ref')}
                    value={sourceRef}
                    onChange={(event) => setSourceRef(event.target.value)}
                    sx={{ minWidth: 140 }}
                  />
                </>
              )}
              {editingSourceId ? (
                <ToolbarIcon label={t('options.market.cancelEdit')} onClick={resetSourceEditor}>
                  <CloseOutlined fontSize="small" />
                </ToolbarIcon>
              ) : null}
              <ToolbarIcon
                label={t(editingSourceId ? 'options.market.saveSource' : 'options.market.addSource')}
                onClick={() => void submitSource()}
              >
                {editingSourceId ? <SaveOutlined fontSize="small" /> : <AddOutlined fontSize="small" />}
              </ToolbarIcon>
            </Stack>

            {marketSources.length > 0 ? (
              <List disablePadding sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1 }}>
                {sourceSummaries.map((catalog) => (
                  <ListItem
                    key={catalog.source.id}
                    disablePadding
                    secondaryAction={
                      <Stack direction="row" spacing={0.5}>
                        <ToolbarIcon label={t('options.market.editSource')} onClick={() => startEditingSource(catalog.source)}>
                          <EditOutlined fontSize="small" />
                        </ToolbarIcon>
                        <ToolbarIcon label={t('options.market.removeSource')} onClick={() => onRemoveSource(catalog.source.id)}>
                          <DeleteOutlineOutlined fontSize="small" />
                        </ToolbarIcon>
                      </Stack>
                    }
                  >
                    <ListItemButton sx={{ px: 0.5 }}>
                      <ListItemText
                        primary={
                          catalog.source.kind === 'repository' && catalog.source.repository && catalog.source.ref
                            ? `${catalog.title} · ${catalog.source.repository}@${catalog.source.ref}`
                            : catalog.title
                        }
                        secondary={
                          catalog.error
                            ? catalog.error
                            : [
                                ...(catalog.version ? [`${t('options.market.version')}: ${catalog.version}`] : []),
                                catalog.compatible ? t('options.market.available') : t('options.market.incompatible'),
                                t('options.market.sourceClients', { count: catalog.clients.length })
                              ].join(' · ')
                        }
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
                        secondaryTypographyProps={{ variant: 'caption', color: catalog.error ? 'error.main' : 'text.secondary' }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('options.market.emptySources')}
              </Typography>
            )}
          </Stack>
        </DialogContent>
      </Dialog>
    </SectionPanel>
  )
}

function ImportsSection({
  importInputRef,
  transferDraft,
  transferMode,
  transferProvider,
  transferRef,
  transferRefType,
  transferRepository,
  transferSourceMode,
  transferUrl,
  onTransferDraftChange,
  onTransferProviderChange,
  onTransferRefChange,
  onTransferRefTypeChange,
  onTransferRepositoryChange,
  onTransferSourceModeChange,
  onTransferModeChange,
  onCopy,
  onDownload,
  onExport,
  onFetchImport,
  onUpload,
  onApplyImport,
  onReadImportFile,
  onTransferUrlChange
}: {
  importInputRef: React.RefObject<HTMLInputElement | null>
  transferDraft: string
  transferMode: TransferMode
  transferProvider: MarketSourceProvider
  transferRef: string
  transferRefType: MarketSourceRefType
  transferRepository: string
  transferSourceMode: 'direct' | 'repository'
  transferUrl: string
  onTransferDraftChange: (value: string) => void
  onTransferProviderChange: (value: MarketSourceProvider) => void
  onTransferRefChange: (value: string) => void
  onTransferRefTypeChange: (value: MarketSourceRefType) => void
  onTransferRepositoryChange: (value: string) => void
  onTransferSourceModeChange: (value: 'direct' | 'repository') => void
  onTransferModeChange: (mode: TransferMode) => void
  onCopy: () => void
  onDownload: () => void
  onExport: () => void
  onFetchImport: (input: ImportSourceDraftInput) => void
  onUpload: () => void
  onApplyImport: () => void
  onReadImportFile: (file: File | undefined) => void
  onTransferUrlChange: (value: string) => void
}) {
  const { t } = useI18n()
  const parsedTransferSummary = useMemo(() => summarizeWorkspaceBundleText(transferDraft), [transferDraft])

  return (
    <SectionPanel
      title={t('options.imports.title')}
      description={t('options.imports.description')}
      icon={<DownloadOutlined fontSize="small" />}
      action={
        <Stack direction="row" spacing={0.5}>
          <ToolbarIcon label={t('options.imports.copy')} onClick={onCopy}>
            <ContentCopyOutlined fontSize="small" />
          </ToolbarIcon>
          <ToolbarIcon label={t('options.imports.download')} onClick={onDownload}>
            <DownloadOutlined fontSize="small" />
          </ToolbarIcon>
          <ToolbarIcon label={t('options.imports.export')} onClick={onExport}>
            <SaveOutlined fontSize="small" />
          </ToolbarIcon>
          <ToolbarIcon label={t('options.imports.upload')} onClick={onUpload}>
            <FileUploadOutlined fontSize="small" />
          </ToolbarIcon>
        </Stack>
      }
    >
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Tabs value={transferMode} onChange={(_event, next) => onTransferModeChange(next)} variant="standard">
            <Tab value="export" label={t('options.imports.export')} />
            <Tab value="import" label={t('options.imports.import')} />
          </Tabs>
          {transferMode === 'import' ? (
            <ToolbarIcon label={t('options.imports.apply')} onClick={onApplyImport}>
              <SaveOutlined fontSize="small" />
            </ToolbarIcon>
          ) : null}
        </Stack>
        {transferMode === 'import' ? (
          <Stack spacing={1}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={transferSourceMode}
              onChange={(_event, nextValue: 'direct' | 'repository' | null) => {
                if (nextValue) {
                  onTransferSourceModeChange(nextValue)
                }
              }}
            >
              <ToggleButton value="direct">{t('options.imports.sourceMode.direct')}</ToggleButton>
              <ToggleButton value="repository">{t('options.imports.sourceMode.repository')}</ToggleButton>
            </ToggleButtonGroup>

            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1}>
              {transferSourceMode === 'direct' ? (
                <TextField
                  fullWidth
                  size="small"
                  label={t('options.imports.url')}
                  value={transferUrl}
                  onChange={(event) => onTransferUrlChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      onFetchImport({
                        mode: 'direct',
                        url: transferUrl
                      })
                    }
                  }}
                />
              ) : (
                <>
                  <TextField
                    select
                    size="small"
                    label={t('options.imports.provider')}
                    value={transferProvider}
                    onChange={(event) => onTransferProviderChange(event.target.value as MarketSourceProvider)}
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="github">GitHub</MenuItem>
                    <MenuItem value="gitlab">GitLab</MenuItem>
                  </TextField>
                  <TextField
                    fullWidth
                    size="small"
                    label={t('options.imports.repository')}
                    value={transferRepository}
                    onChange={(event) => onTransferRepositoryChange(event.target.value)}
                  />
                  <TextField
                    select
                    size="small"
                    label={t('options.imports.refType')}
                    value={transferRefType}
                    onChange={(event) => onTransferRefTypeChange(event.target.value as MarketSourceRefType)}
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="branch">{t('options.imports.refType.branch')}</MenuItem>
                    <MenuItem value="tag">{t('options.imports.refType.tag')}</MenuItem>
                    <MenuItem value="commit">{t('options.imports.refType.commit')}</MenuItem>
                  </TextField>
                  <TextField
                    size="small"
                    label={t('options.imports.ref')}
                    value={transferRef}
                    onChange={(event) => onTransferRefChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        onFetchImport({
                          mode: 'repository',
                          provider: transferProvider,
                          repository: transferRepository,
                          refType: transferRefType,
                          ref: transferRef
                        })
                      }
                    }}
                    sx={{ minWidth: 140 }}
                  />
                </>
              )}
              <Button
                variant="outlined"
                onClick={() =>
                  onFetchImport(
                    transferSourceMode === 'direct'
                      ? {
                          mode: 'direct',
                          url: transferUrl
                        }
                      : {
                          mode: 'repository',
                          provider: transferProvider,
                          repository: transferRepository,
                          refType: transferRefType,
                          ref: transferRef
                        }
                  )
                }
              >
                {t('options.imports.fetch')}
              </Button>
            </Stack>
          </Stack>
        ) : null}
        <Typography variant="caption" color={parsedTransferSummary.valid ? 'text.secondary' : 'error.main'}>
          {parsedTransferSummary.valid
            ? [
                ...(parsedTransferSummary.version
                  ? [t('options.imports.summaryVersion', { version: parsedTransferSummary.version })]
                  : []),
                `${t('options.imports.summaryRoutes', { count: parsedTransferSummary.routeClients })}`,
                parsedTransferSummary.backgroundEnabled
                  ? t('options.imports.summaryBackgroundOn')
                  : t('options.imports.summaryBackgroundOff')
              ].join(' · ')
            : t('options.imports.summaryInvalid')}
        </Typography>
        <TextField
          multiline
          minRows={18}
          value={transferDraft}
          onChange={(event) => onTransferDraftChange(event.target.value)}
        />
        <input
          ref={importInputRef}
          hidden
          type="file"
          accept="application/json,.json"
          onChange={(event) => onReadImportFile(event.target.files?.[0])}
        />
      </Stack>
    </SectionPanel>
  )
}

function SectionPanel({
  action,
  children,
  description,
  icon,
  title
}: {
  action?: ReactNode
  children: ReactNode
  description?: string
  icon?: ReactNode
  title: string
}) {
  return (
    <Box
      sx={{
        px: 0,
        py: 0.25
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Box>
            <Stack direction="row" spacing={0.75} alignItems="center">
              {icon ? (
                <Box sx={{ color: 'primary.main', display: 'grid', placeItems: 'center' }}>
                  {icon}
                </Box>
              ) : null}
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {title}
              </Typography>
            </Stack>
            {description ? (
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            ) : null}
          </Box>
          {action}
        </Stack>
        <Divider />
        {children}
      </Stack>
    </Box>
  )
}

function InlineStatus({
  message,
  tone
}: {
  message: string
  tone: 'info' | 'success' | 'error'
}) {
  const palette = {
    info: { color: 'text.secondary', dot: 'text.secondary', bg: 'action.hover' },
    success: { color: 'success.main', dot: 'success.main', bg: 'success.main' },
    error: { color: 'error.main', dot: 'error.main', bg: 'error.main' }
  }[tone]

  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minHeight: 24, px: 0.25 }}>
      <Box
        sx={{
          width: 7,
          height: 7,
          borderRadius: '999px',
          bgcolor: palette.dot,
          flexShrink: 0
        }}
      />
      <Typography variant="body2" sx={{ color: palette.color }}>
        {message}
      </Typography>
    </Stack>
  )
}

function ToolbarIcon({
  children,
  disabled,
  label,
  onClick
}: {
  children: ReactNode
  disabled?: boolean
  label: string
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <Tooltip title={label}>
      <span>
        <IconButton aria-label={label} size="small" onClick={onClick} disabled={disabled}>
          {children}
        </IconButton>
      </span>
    </Tooltip>
  )
}
