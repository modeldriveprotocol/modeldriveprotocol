import {
  type ClientTransport,
  type MdpClient,
  HttpLoopClientTransport,
  WebSocketClientTransport,
  createMdpClient
} from '@modeldriveprotocol/client'

import {
  type InjectedToolDescriptor,
  type MainWorldBridgeState,
  type PageCommand,
  type PageCommandEnvelope,
  type PageCommandResponse,
  type PageRecordedAction,
  type PageRecordingResult,
  type PageSelectorCaptureResult,
  PAGE_COMMAND_CHANNEL
} from '#~/page/messages.js'
import {
  type ExtensionConfig,
  type RouteClientConfig,
  type RouteClientRecording,
  type RouteSelectorResource,
  createRouteClientFromUrl,
  getOriginMatchPattern,
  listWorkspaceMatchPatterns,
  matchesAnyPattern,
  matchesRouteClient,
  normalizeConfig,
  summarizeRouteRules
} from '#~/shared/config.js'
import { createMarketCatalogDigest, fetchMarketCatalog } from '#~/shared/market-catalog.js'
import {
  loadConfig,
  loadMarketSourceSyncState,
  saveConfig,
  saveMarketSourceSyncState,
  type MarketSourcePendingUpdate,
  type MarketSourceSnapshot
} from '#~/shared/storage.js'
import {
  type UnknownRecord,
  asRecord,
  createRequestId,
  readNumber,
  readString,
  serializeError
} from '#~/shared/utils.js'
import { registerBackgroundCapabilities } from './capabilities/index.js'
import { registerRouteClientCapabilities } from './capabilities/route.js'
import type { ChromeExtensionRuntimeApi } from './runtime-api.js'
import {
  type BrowserTabSummary,
  type ManagedClientConnectionState,
  type PopupState,
  type TabInjectionState,
  createClientKey,
  createManagedScriptId,
  createNotificationIcon,
  jsonResource,
  serializeTab,
  summarizeRouteClientAssets,
  toTargetTabSummary
} from './shared.js'

const CONTENT_SCRIPT_ID = 'mdp-chrome-extension-content'
const RECONNECT_DELAY_MS = 5_000

interface ManagedClientHandle {
  key: string
  kind: 'background' | 'route'
  clientId: string
  routeClientId?: string
  client: MdpClient
}

interface ActiveRecordingSession {
  routeClientId: string
  routeClientName: string
  tabId: number
  startedAt: string
}

interface SelectorCaptureSession {
  routeClientId: string
  routeClientName: string
  tabId: number
}

export class ChromeExtensionRuntime implements ChromeExtensionRuntimeApi {
  private currentConfig: ExtensionConfig | undefined
  private readonly clients = new Map<string, ManagedClientHandle>()
  private readonly clientStates = new Map<string, ManagedClientConnectionState>()
  private readonly tabInjectionState = new Map<number, TabInjectionState>()
  private refreshPromise: Promise<void> | undefined
  private marketSyncCheckPromise: Promise<void> | undefined
  private reconnectTimer: ReturnType<typeof globalThis.setTimeout> | undefined
  private activeRecording: ActiveRecordingSession | undefined
  private selectorCaptureSession: SelectorCaptureSession | undefined
  private pendingSelectorCapture:
    | {
        routeClientId: string
        routeClientName: string
        resource: RouteSelectorResource
        capturedAt: string
      }
    | undefined

  async initialize(): Promise<void> {
    await this.refresh()
    await this.checkMarketSourceUpdatesOnStartup()
  }

  async refresh(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = this.doRefresh().finally(() => {
      this.refreshPromise = undefined
    })

    return this.refreshPromise
  }

  async getStatus(): Promise<PopupState> {
    const config = await this.getConfig()
    const marketSyncState = await loadMarketSourceSyncState()
    const grantedPatterns = listWorkspaceMatchPatterns(config)
    const permissionState = await this.getPermissionState(grantedPatterns)
    const activeTab = await this.getActiveTab()
    const activeOriginPattern = typeof activeTab?.url === 'string' ? getOriginMatchPattern(activeTab.url) : undefined
    const activeTabHasPermission = typeof activeTab?.url === 'string'
      ? matchesAnyPattern(activeTab.url, permissionState.granted)
      : false
    const activeRouteClients = config.routeClients.filter((client) =>
      matchesRouteClient(activeTab?.url, client)
    )
    const bridgeState = typeof activeTab?.id === 'number' &&
        typeof activeTab.url === 'string' &&
        activeTabHasPermission
      ? await this.safeGetMainWorldState(activeTab.id)
      : undefined

    return {
      config,
      clients: [
        {
          clientKey: createClientKey('background'),
          kind: 'background',
          clientId: config.backgroundClient.clientId,
          clientName: config.backgroundClient.clientName,
          clientDescription: config.backgroundClient.clientDescription,
          icon: config.backgroundClient.icon,
          enabled: config.backgroundClient.enabled,
          connectionState: this.clientStates.get(createClientKey('background'))?.connectionState ??
            (config.backgroundClient.enabled ? 'idle' : 'disabled'),
          lastError: this.clientStates.get(createClientKey('background'))?.lastError,
          lastConnectedAt: this.clientStates.get(createClientKey('background'))?.lastConnectedAt,
          matchPatterns: [],
          matchesActiveTab: false,
          recordingCount: 0,
          selectorResourceCount: 0,
          skillCount: 0
        },
        ...config.routeClients.map((client) => {
          const key = createClientKey('route', client.id)
          const state = this.clientStates.get(key)
          const assets = summarizeRouteClientAssets(client)

          return {
            clientKey: key,
            kind: 'route' as const,
            id: client.id,
            clientId: client.clientId,
            clientName: client.clientName,
            clientDescription: client.clientDescription,
            icon: client.icon,
            enabled: client.enabled,
            connectionState: state?.connectionState ?? (client.enabled ? 'idle' : 'disabled'),
            lastError: state?.lastError,
            lastConnectedAt: state?.lastConnectedAt,
            matchPatterns: client.matchPatterns,
            routeRuleSummary: summarizeRouteRules(client),
            matchesActiveTab: matchesRouteClient(activeTab?.url, client),
            recordingCount: assets.recordingCount,
            selectorResourceCount: assets.selectorResourceCount,
            skillCount: assets.skillCount
          }
        })
      ],
      onlineClientCount: [...this.clientStates.values()]
        .filter((state) => state.connectionState === 'connected').length,
      marketUpdates: {
        autoCheckEnabled: config.marketAutoCheckUpdates,
        ...(marketSyncState.lastCheckedAt ? { lastCheckedAt: marketSyncState.lastCheckedAt } : {}),
        pendingUpdateCount: marketSyncState.pendingUpdates.length,
        pendingUpdates: marketSyncState.pendingUpdates
      },
      activeRouteClientIds: activeRouteClients.map((client) => client.id),
      activeRouteClientNames: activeRouteClients.map((client) => client.clientName),
      ...(this.activeRecording ? { activeRecording: this.activeRecording } : {}),
      ...(this.pendingSelectorCapture ? { pendingSelectorCapture: this.pendingSelectorCapture } : {}),
      ...(activeOriginPattern ? { activeOriginPattern } : {}),
      ...(activeTabHasPermission ? { activeTabHasPermission: true } : {}),
      ...(bridgeState ? { bridgeState } : {}),
      ...(activeTab && typeof activeTab.id === 'number'
        ? {
            activeTab: {
              id: activeTab.id,
              ...(typeof activeTab.title === 'string' ? { title: activeTab.title } : {}),
              ...(typeof activeTab.url === 'string' ? { url: activeTab.url } : {}),
              ...(typeof activeTab.status === 'string' ? { status: activeTab.status } : {}),
              active: Boolean(activeTab.active),
              eligible: activeRouteClients.length > 0
            }
          }
        : {}),
      injectedTools: bridgeState?.tools ?? []
    }
  }

  async getConfig(): Promise<ExtensionConfig> {
    return this.currentConfig ?? (await loadConfig())
  }

  private async checkMarketSourceUpdatesOnStartup(): Promise<void> {
    if (this.marketSyncCheckPromise) {
      return this.marketSyncCheckPromise
    }

    this.marketSyncCheckPromise = this.doCheckMarketSourceUpdatesOnStartup().finally(() => {
      this.marketSyncCheckPromise = undefined
    })

    return this.marketSyncCheckPromise
  }

  private async doCheckMarketSourceUpdatesOnStartup(): Promise<void> {
    const config = await this.getConfig()

    if (!config.marketAutoCheckUpdates || config.marketSources.length === 0) {
      await saveMarketSourceSyncState({
        snapshots: [],
        pendingUpdates: []
      })
      return
    }

    const previousState = await loadMarketSourceSyncState()
    const previousSnapshotByUrl = new Map(previousState.snapshots.map((snapshot) => [snapshot.sourceUrl, snapshot]))
    const previousPendingKeys = new Set(previousState.pendingUpdates.map((update) => `${update.sourceUrl}:${update.version}:${update.checkedAt}`))
    const results = await Promise.all(config.marketSources.map((source) => fetchMarketCatalog(source)))
    const checkedAt = new Date().toISOString()
    const snapshots: MarketSourceSnapshot[] = []
    const pendingUpdates: MarketSourcePendingUpdate[] = []
    let shouldNotify = false

    for (const result of results) {
      const previousSnapshot = previousSnapshotByUrl.get(result.source.url)

      if (result.error) {
        if (previousSnapshot) {
          snapshots.push(previousSnapshot)
        }
        continue
      }

      const digest = createMarketCatalogDigest(result)
      const snapshot: MarketSourceSnapshot = {
        sourceId: result.source.id,
        sourceUrl: result.source.url,
        title: result.title,
        version: result.version,
        digest,
        checkedAt,
        clientCount: result.clients.length
      }

      snapshots.push(snapshot)

      if (previousSnapshot && previousSnapshot.digest !== digest) {
        const pendingUpdate: MarketSourcePendingUpdate = {
          sourceId: result.source.id,
          sourceUrl: result.source.url,
          title: result.title,
          version: result.version,
          checkedAt
        }
        pendingUpdates.push(pendingUpdate)

        if (!previousPendingKeys.has(`${pendingUpdate.sourceUrl}:${pendingUpdate.version}:${pendingUpdate.checkedAt}`)) {
          shouldNotify = true
        }
      }
    }

    await saveMarketSourceSyncState({
      lastCheckedAt: checkedAt,
      snapshots,
      pendingUpdates
    })

    if (shouldNotify && pendingUpdates.length > 0) {
      await this.showNotification({
        message:
          pendingUpdates.length === 1
            ? `${pendingUpdates[0].title} has market updates. Open Market to review.`
            : `${pendingUpdates.length} market sources changed. Open Market to review updates.`
      })
    }
  }

  async listGrantedOrigins(): Promise<unknown> {
    return chrome.permissions.getAll()
  }

  async listTabs(options: {
    windowId?: number
    activeOnly?: boolean
  }): Promise<BrowserTabSummary[]> {
    const query: chrome.tabs.QueryInfo = {}

    if (options.windowId !== undefined) {
      query.windowId = options.windowId
    }

    if (options.activeOnly !== undefined) {
      query.active = options.activeOnly
    }

    const tabs = await chrome.tabs.query(query)
    return tabs.map((tab) => serializeTab(tab))
  }

  async activateTab(tabId: number): Promise<BrowserTabSummary> {
    const tab = await chrome.tabs.update(tabId, { active: true })

    if (!tab) {
      throw new Error(`Unknown tab ${tabId}`)
    }

    return serializeTab(tab)
  }

  async reloadTab(args: unknown): Promise<{
    reloaded: true
    tab: BrowserTabSummary
  }> {
    const tab = await this.resolveTargetTab(args)
    await chrome.tabs.reload(tab.id)

    return {
      reloaded: true,
      tab: serializeTab(tab)
    }
  }

  async createTab(options: {
    url: string
    active?: boolean
  }): Promise<BrowserTabSummary> {
    const tab = await chrome.tabs.create({
      url: options.url,
      ...(options.active !== undefined ? { active: options.active } : {})
    })
    return serializeTab(tab)
  }

  async closeTab(args: unknown): Promise<{
    closed: true
    tabId: number
  }> {
    const tab = await this.resolveTargetTab(args)
    await chrome.tabs.remove(tab.id)

    return {
      closed: true,
      tabId: tab.id
    }
  }

  async showNotification(options: {
    title?: string
    message: string
  }): Promise<{
    shown: true
    notificationId: string
  }> {
    const config = await this.getConfig()
    const notificationId = createRequestId('notification')

    await chrome.notifications.create(notificationId, {
      type: 'basic',
      title: options.title ?? config.notificationTitle,
      message: options.message,
      iconUrl: createNotificationIcon()
    })

    return {
      shown: true,
      notificationId
    }
  }

  async openOptionsPage(): Promise<{
    opened: true
  }> {
    await chrome.runtime.openOptionsPage()
    return {
      opened: true
    }
  }

  async runPageCommandForRouteClient<TResult>(
    routeClientId: string,
    args: unknown,
    command: PageCommand
  ): Promise<TResult> {
    const routeClient = await this.getRouteClient(routeClientId)
    const tab = await this.resolveAllowedPageTabForRouteClient(routeClient, args)
    return this.sendPageCommand<TResult>(tab.id, routeClient, command)
  }

  async injectToolScriptForRouteClient(
    routeClientId: string,
    input: {
      tabId?: number
      source: string
      scriptArgs?: unknown
      scriptId?: string
      force?: boolean
    }
  ): Promise<InjectedToolDescriptor[]> {
    const routeClient = await this.getRouteClient(routeClientId)
    const tab = await this.resolveAllowedPageTabForRouteClient(routeClient, input)
    const scriptId = input.scriptId ?? createManagedScriptId(`page-tool-${routeClient.id}`, input.source)

    await this.ensureScriptsInjected(tab.id, routeClient, true)
    await this.dispatchPageCommand(tab.id, {
      type: 'runMainWorld',
      action: 'runScript',
      args: {
        source: input.source,
        scriptId,
        ...(input.scriptArgs !== undefined ? { scriptArgs: input.scriptArgs } : {}),
        ...(input.force !== undefined ? { force: input.force } : {})
      }
    })

    return this.listInjectedTools(tab.id, routeClient)
  }

  async getInjectedStateForRouteClient(
    routeClientId: string,
    args: unknown
  ): Promise<MainWorldBridgeState> {
    const routeClient = await this.getRouteClient(routeClientId)
    const tab = await this.resolveAllowedPageTabForRouteClient(routeClient, args)
    return this.getMainWorldState(tab.id, routeClient)
  }

  async listInjectedToolsForRouteClient(
    routeClientId: string,
    args: unknown
  ): Promise<InjectedToolDescriptor[]> {
    const routeClient = await this.getRouteClient(routeClientId)
    const tab = await this.resolveAllowedPageTabForRouteClient(routeClient, args)
    return this.listInjectedTools(tab.id, routeClient)
  }

  async callInjectedToolForRouteClient(
    routeClientId: string,
    input: {
      tabId?: number
      name: string
      toolArgs?: unknown
    }
  ): Promise<unknown> {
    const routeClient = await this.getRouteClient(routeClientId)
    const tab = await this.resolveAllowedPageTabForRouteClient(routeClient, input)
    return this.sendPageCommand(tab.id, routeClient, {
      type: 'runMainWorld',
      action: 'invokeTool',
      args: {
        name: input.name,
        ...(input.toolArgs !== undefined ? { toolArgs: input.toolArgs } : {})
      }
    })
  }

  async getRouteClient(routeClientId: string): Promise<RouteClientConfig> {
    const config = await this.getConfig()
    const routeClient = config.routeClients.find((client) => client.id === routeClientId)

    if (!routeClient) {
      throw new Error(`Unknown route client "${routeClientId}"`)
    }

    return routeClient
  }

  async runRouteRecording(
    routeClientId: string,
    recordingId: string,
    args: unknown
  ): Promise<unknown> {
    const routeClient = await this.getRouteClient(routeClientId)
    const recording = routeClient.recordings.find((item) => item.id === recordingId)

    if (!recording) {
      throw new Error(`Unknown recording "${recordingId}" for route client "${routeClientId}"`)
    }

    const tab = await this.resolveAllowedPageTabForRouteClient(routeClient, args)
    let previousOffset = 0

    for (const step of recording.steps) {
      const delayMs = Math.min(Math.max(0, step.timestampOffsetMs - previousOffset), 350)

      if (delayMs > 0) {
        await delay(delayMs)
      }

      switch (step.type) {
        case 'click':
          await this.sendPageCommand(tab.id, routeClient, {
            type: 'click',
            selector: step.selector
          })
          break
        case 'fill':
          await this.sendPageCommand(tab.id, routeClient, {
            type: 'fill',
            selector: step.selector,
            value: step.value ?? ''
          })
          break
        case 'pressKey':
          await this.sendPageCommand(tab.id, routeClient, {
            type: 'pressKey',
            key: step.key ?? 'Enter',
            ...(step.code ? { code: step.code } : {}),
            ...(step.selector ? { selector: step.selector } : {})
          })
          break
      }

      previousOffset = step.timestampOffsetMs
    }

    return {
      completed: true,
      routeClientId,
      recordingId,
      stepCount: recording.steps.length,
      tabId: tab.id
    }
  }

  async listRouteRecordings(routeClientId: string): Promise<RouteClientRecording[]> {
    return (await this.getRouteClient(routeClientId)).recordings
  }

  async listRouteSelectorResources(routeClientId: string): Promise<RouteSelectorResource[]> {
    return (await this.getRouteClient(routeClientId)).selectorResources
  }

  async handleRuntimeMessage(message: UnknownRecord, sender?: chrome.runtime.MessageSender): Promise<unknown> {
    const type = readString(message, 'type')

    switch (type) {
      case 'popup:getState':
      case 'runtime:getStatus':
        return this.getStatus()
      case 'popup:openOptions':
        return this.openOptionsPage()
      case 'popup:createRouteClientFromActiveTab':
        return this.createRouteClientFromActiveTab(readString(message, 'clientName'))
      case 'popup:injectActiveTab': {
        const routeClient = await this.resolvePopupRouteClient(readString(message, 'routeClientId'))
        const tab = await this.requireMatchingActiveTab(routeClient)
        await this.ensureScriptsInjected(tab.id, routeClient, true)
        return {
          injected: true,
          routeClientId: routeClient.id,
          tabId: tab.id
        }
      }
      case 'popup:grantActiveTabOrigin': {
        const routeClient = await this.resolvePopupRouteClient(readString(message, 'routeClientId'))
        const pattern = readString(message, 'pattern')

        if (!pattern) {
          throw new Error('A granted host origin pattern is required.')
        }

        return this.persistGrantedActiveTabOrigin(routeClient.id, pattern)
      }
      case 'popup:startRecording': {
        const routeClient = await this.resolvePopupRouteClient(readString(message, 'routeClientId'))
        return this.startRecording(routeClient.id)
      }
      case 'popup:stopRecording': {
        const name = readString(message, 'name')
        const description = readString(message, 'description')
        return this.stopRecording({
          ...(name ? { name } : {}),
          ...(description ? { description } : {})
        })
      }
      case 'popup:startSelectorCapture': {
        const routeClient = await this.resolvePopupRouteClient(readString(message, 'routeClientId'))
        return this.startSelectorCapture(routeClient.id)
      }
      case 'popup:clearPendingSelectorCapture':
        this.pendingSelectorCapture = undefined
        return {
          cleared: true
        }
      case 'popup:runRecording': {
        const routeClientId = readString(message, 'routeClientId')
        const recordingId = readString(message, 'recordingId')

        if (!routeClientId || !recordingId) {
          throw new Error('routeClientId and recordingId are required')
        }

        return this.runRouteRecording(routeClientId, recordingId, undefined)
      }
      case 'runtime:refresh':
        await this.refresh()
        return { refreshed: true }
      case 'page:selectorCaptured':
        return this.handleSelectorCapturedMessage(message, sender)
      default:
        return undefined
    }
  }

  async handleTabUpdated(tabId: number, url: string | undefined): Promise<void> {
    const config = await this.getConfig()
    const grantedPatterns = listWorkspaceMatchPatterns(config)
    const permissionState = await this.getPermissionState(grantedPatterns)
    const existingState = this.tabInjectionState.get(tabId)

    if (existingState && existingState.url !== url) {
      this.tabInjectionState.delete(tabId)
    }

    if (!url) {
      return
    }

    await Promise.all(
      config.routeClients.map(async (client) => {
        if (
          matchesRouteClient(url, client) &&
          matchesAnyPattern(url, permissionState.granted)
        ) {
          await this.ensureScriptsInjected(tabId, client, client.autoInjectBridge)
        }
      })
    )
  }

  handleTabRemoved(tabId: number): void {
    this.tabInjectionState.delete(tabId)

    if (this.activeRecording?.tabId === tabId) {
      this.activeRecording = undefined
    }

    if (this.selectorCaptureSession?.tabId === tabId) {
      this.selectorCaptureSession = undefined
    }
  }

  private async doRefresh(): Promise<void> {
    const config = normalizeConfig(await loadConfig())
    const permissionState = await this.syncContentScriptRegistration(config)

    this.currentConfig = config
    await this.bootstrapOpenTabs(config, permissionState.granted)
    await this.syncClients(config)
  }

  private async syncClients(config: ExtensionConfig): Promise<void> {
    await this.disconnectAllClients()

    const pending: Array<Promise<void>> = []

    if (config.backgroundClient.enabled) {
      pending.push(this.connectBackgroundClient(config))
    } else {
      this.clientStates.set(createClientKey('background'), {
        connectionState: 'disabled'
      })
    }

    for (const routeClient of config.routeClients) {
      if (!routeClient.enabled) {
        this.clientStates.set(createClientKey('route', routeClient.id), {
          connectionState: 'disabled'
        })
        continue
      }

      pending.push(this.connectRouteClient(config, routeClient))
    }

    await Promise.all(pending)
  }

  private async connectBackgroundClient(config: ExtensionConfig): Promise<void> {
    const key = createClientKey('background')
    this.clientStates.set(key, { connectionState: 'connecting' })

    try {
      const transport = createTransport(config.serverUrl)
      transport.onClose(() => {
        this.clientStates.set(key, { connectionState: 'idle' })
        this.scheduleReconnect()
      })

      const manifest = chrome.runtime.getManifest()
      const client = createMdpClient({
        serverUrl: config.serverUrl,
        transport,
        client: {
          id: config.backgroundClient.clientId,
          name: config.backgroundClient.clientName,
          description: config.backgroundClient.clientDescription,
          version: manifest.version,
          platform: 'chrome-extension',
          metadata: {
            manifestVersion: manifest.manifest_version,
            extensionId: chrome.runtime.id,
            clientKind: 'background'
          }
        }
      })

      registerBackgroundCapabilities(client, this)
      await client.connect()
      client.register()

      this.clients.set(key, {
        key,
        kind: 'background',
        clientId: config.backgroundClient.clientId,
        client
      })
      this.clientStates.set(key, {
        connectionState: 'connected',
        lastConnectedAt: new Date().toISOString()
      })
    } catch (error) {
      this.clientStates.set(key, {
        connectionState: 'error',
        lastError: serializeError(error).message
      })
      this.scheduleReconnect()
    }
  }

  private async connectRouteClient(
    config: ExtensionConfig,
    routeClient: RouteClientConfig
  ): Promise<void> {
    const key = createClientKey('route', routeClient.id)
    this.clientStates.set(key, { connectionState: 'connecting' })

    try {
      const transport = createTransport(config.serverUrl)
      transport.onClose(() => {
        this.clientStates.set(key, { connectionState: 'idle' })
        this.scheduleReconnect()
      })

      const manifest = chrome.runtime.getManifest()
      const assets = summarizeRouteClientAssets(routeClient)
      const client = createMdpClient({
        serverUrl: config.serverUrl,
        transport,
        client: {
          id: routeClient.clientId,
          name: routeClient.clientName,
          description: routeClient.clientDescription,
          version: manifest.version,
          platform: 'chrome-extension',
          metadata: {
            manifestVersion: manifest.manifest_version,
            extensionId: chrome.runtime.id,
            clientKind: 'route',
            routeClientId: routeClient.id,
            matchPatternCount: routeClient.matchPatterns.length,
            routeRuleCount: routeClient.routeRules.length,
            recordingCount: assets.recordingCount,
            selectorResourceCount: assets.selectorResourceCount,
            skillCount: assets.skillCount
          }
        }
      })

      registerRouteClientCapabilities(client, this, routeClient)
      await client.connect()
      client.register()

      this.clients.set(key, {
        key,
        kind: 'route',
        clientId: routeClient.clientId,
        routeClientId: routeClient.id,
        client
      })
      this.clientStates.set(key, {
        connectionState: 'connected',
        lastConnectedAt: new Date().toISOString()
      })
    } catch (error) {
      this.clientStates.set(key, {
        connectionState: 'error',
        lastError: serializeError(error).message
      })
      this.scheduleReconnect()
    }
  }

  private async disconnectAllClients(): Promise<void> {
    if (this.reconnectTimer !== undefined) {
      globalThis.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }

    const handles = [...this.clients.values()]
    this.clients.clear()

    await Promise.all(
      handles.map(async (handle) => {
        try {
          await handle.client.disconnect()
        } catch {
          // Best effort shutdown.
        }
      })
    )
  }

  private async resolvePopupRouteClient(routeClientId: string | undefined): Promise<RouteClientConfig> {
    const config = await this.getConfig()

    if (routeClientId) {
      return this.getRouteClient(routeClientId)
    }

    const activeTab = await this.getActiveTab()
    const activeMatch = config.routeClients.find((client) => matchesRouteClient(activeTab?.url, client))

    if (activeMatch) {
      return activeMatch
    }

    const firstEnabled = config.routeClients.find((client) => client.enabled)

    if (firstEnabled) {
      return firstEnabled
    }

    throw new Error('No enabled route client is available')
  }

  private async startRecording(routeClientId: string): Promise<{
    started: true
    routeClientId: string
    tabId: number
  }> {
    const routeClient = await this.getRouteClient(routeClientId)
    const tab = await this.requireMatchingActiveTab(routeClient)

    await this.ensureScriptsInjected(tab.id, routeClient, true)
    await this.dispatchPageCommand(tab.id, {
      type: 'startRecording'
    })

    this.activeRecording = {
      routeClientId: routeClient.id,
      routeClientName: routeClient.clientName,
      tabId: tab.id,
      startedAt: new Date().toISOString()
    }

    return {
      started: true,
      routeClientId: routeClient.id,
      tabId: tab.id
    }
  }

  private async stopRecording(options: {
    name?: string
    description?: string
  }): Promise<{
    saved: true
    routeClientId: string
    recordingId: string
    stepCount: number
  }> {
    if (!this.activeRecording) {
      throw new Error('No recording is active')
    }

    const session = this.activeRecording
    const routeClient = await this.getRouteClient(session.routeClientId)
    const result = await this.dispatchPageCommand<PageRecordingResult>(session.tabId, {
      type: 'stopRecording'
    })
    const recording = createRecordingFromCapture(routeClient, result, options)
    this.activeRecording = undefined

    await this.updateRouteClient(routeClient.id, (client) => ({
      ...client,
      recordings: [recording, ...client.recordings]
    }))
    await this.refresh()

    return {
      saved: true,
      routeClientId: routeClient.id,
      recordingId: recording.id,
      stepCount: recording.steps.length
    }
  }

  private async startSelectorCapture(routeClientId: string): Promise<{
    started: true
    routeClientId: string
    tabId: number
  }> {
    const routeClient = await this.getRouteClient(routeClientId)
    const tab = await this.requireMatchingActiveTab(routeClient)

    await this.ensureScriptsInjected(tab.id, routeClient, true)
    await this.dispatchPageCommand(tab.id, {
      type: 'startSelectorCapture'
    })

    this.selectorCaptureSession = {
      routeClientId: routeClient.id,
      routeClientName: routeClient.clientName,
      tabId: tab.id
    }

    return {
      started: true,
      routeClientId: routeClient.id,
      tabId: tab.id
    }
  }

  private async handleSelectorCapturedMessage(
    message: UnknownRecord,
    sender?: chrome.runtime.MessageSender
  ): Promise<{
    captured: true
    routeClientId: string
    resourceId: string
  }> {
    if (!this.selectorCaptureSession) {
      throw new Error('No selector capture session is active')
    }

    if (sender?.tab?.id !== this.selectorCaptureSession.tabId) {
      throw new Error('Selector capture came from an unexpected tab')
    }

    const routeClient = await this.getRouteClient(this.selectorCaptureSession.routeClientId)
    const result = message.data as PageSelectorCaptureResult
    const resource = createSelectorResource(routeClient, result)

    await this.updateRouteClient(routeClient.id, (client) => ({
      ...client,
      selectorResources: [resource, ...client.selectorResources]
    }))

    this.pendingSelectorCapture = {
      routeClientId: routeClient.id,
      routeClientName: routeClient.clientName,
      resource,
      capturedAt: new Date().toISOString()
    }
    this.selectorCaptureSession = undefined

    await this.refresh()

    return {
      captured: true,
      routeClientId: routeClient.id,
      resourceId: resource.id
    }
  }

  private async resolveAllowedPageTabForRouteClient(
    routeClient: RouteClientConfig,
    args: unknown
  ): Promise<ReturnType<typeof toTargetTabSummary>> {
    const explicitTabId = readNumber(asRecord(args), 'tabId')

    if (explicitTabId !== undefined) {
      const explicitTab = await chrome.tabs.get(explicitTabId)
      const summary = toTargetTabSummary(explicitTab)
      await this.ensureAllowedRouteTab(summary, routeClient)
      return summary
    }

    const activeTab = await this.getActiveTab()

    if (activeTab?.id !== undefined && matchesRouteClient(activeTab.url, routeClient)) {
      await this.ensureAllowedRouteTab(toTargetTabSummary(activeTab), routeClient)
      return toTargetTabSummary(activeTab)
    }

    const tabs = await chrome.tabs.query({})
    const fallback = tabs.find((tab) => matchesRouteClient(tab.url, routeClient))

    if (!fallback) {
      throw new Error(`No open tab currently matches route client "${routeClient.clientName}"`)
    }

    const summary = toTargetTabSummary(fallback)
    await this.ensureAllowedRouteTab(summary, routeClient)
    return summary
  }

  private async requireMatchingActiveTab(
    routeClient: RouteClientConfig
  ): Promise<ReturnType<typeof toTargetTabSummary>> {
    const activeTab = await this.getActiveTab()

    if (!activeTab?.id) {
      throw new Error('No active tab is available')
    }

    const summary = toTargetTabSummary(activeTab)
    await this.ensureAllowedRouteTab(summary, routeClient)
    return summary
  }

  private async resolveTargetTab(args: unknown): Promise<ReturnType<typeof toTargetTabSummary>> {
    const tabId = readNumber(asRecord(args), 'tabId')

    if (tabId !== undefined) {
      return toTargetTabSummary(await chrome.tabs.get(tabId))
    }

    const activeTab = await this.getActiveTab()

    if (!activeTab) {
      throw new Error('No active tab is available')
    }

    return toTargetTabSummary(activeTab)
  }

  private async getActiveTab(): Promise<BrowserTabSummary | undefined> {
    const tabs = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true
    })

    const activeTab = tabs.at(0)
    return activeTab ? serializeTab(activeTab) : undefined
  }

  private async ensureAllowedRouteTab(
    tab: { id: number; url?: string },
    routeClient: RouteClientConfig
  ): Promise<void> {
    if (!tab.url) {
      throw new Error('Target tab does not expose a URL')
    }

    if (!matchesRouteClient(tab.url, routeClient)) {
      throw new Error(
        `Target tab URL does not match route client "${routeClient.clientName}" patterns and rules`
      )
    }

    const permissionState = await this.getPermissionState(routeClient.matchPatterns)

    if (!matchesAnyPattern(tab.url, permissionState.granted)) {
      throw new Error(
        `Target tab URL is not covered by granted host permissions for route client "${routeClient.clientName}"`
      )
    }
  }

  private async getPermissionState(patterns: string[]): Promise<{
    granted: string[]
    missing: string[]
  }> {
    const granted: string[] = []
    const missing: string[] = []

    for (const pattern of patterns) {
      const contains = (await chrome.permissions.contains({
        origins: [pattern]
      })) as boolean

      if (contains) {
        granted.push(pattern)
      } else {
        missing.push(pattern)
      }
    }

    return {
      granted,
      missing
    }
  }

  private async syncContentScriptRegistration(config: ExtensionConfig): Promise<{
    granted: string[]
    missing: string[]
  }> {
    const matchPatterns = listWorkspaceMatchPatterns(config)
    const permissionState = await this.getPermissionState(matchPatterns)

    try {
      await chrome.scripting.unregisterContentScripts({
        ids: [CONTENT_SCRIPT_ID]
      })
    } catch {
      // Ignore missing registrations.
    }

    if (permissionState.granted.length > 0) {
      await chrome.scripting.registerContentScripts([
        {
          id: CONTENT_SCRIPT_ID,
          matches: permissionState.granted,
          js: ['content-script.js'],
          runAt: 'document_idle',
          persistAcrossSessions: true
        }
      ])
    }

    return permissionState
  }

  private async bootstrapOpenTabs(
    config: ExtensionConfig,
    grantedPatterns: string[]
  ): Promise<void> {
    if (grantedPatterns.length === 0) {
      return
    }

    const tabs = await chrome.tabs.query({})

    await Promise.all(
      tabs.map(async (tab) => {
        if (typeof tab.id !== 'number' || typeof tab.url !== 'string') {
          return
        }

        await Promise.all(
          config.routeClients.map(async (client) => {
            if (
              matchesRouteClient(tab.url, client) &&
              matchesAnyPattern(tab.url, grantedPatterns)
            ) {
              try {
                await this.ensureScriptsInjected(tab.id!, client, client.autoInjectBridge)
              } catch {
                // Ignore tabs that cannot be scripted.
              }
            }
          })
        )
      })
    )
  }

  private async ensureScriptsInjected(
    tabId: number,
    routeClient: RouteClientConfig,
    injectBridge: boolean
  ): Promise<void> {
    const tab = await chrome.tabs.get(tabId)
    const currentUrl = typeof tab.url === 'string' ? tab.url : undefined
    const currentState = this.tabInjectionState.get(tabId)
    const state: TabInjectionState = !currentState || currentState.url !== currentUrl
      ? {
          ...(currentUrl ? { url: currentUrl } : {}),
          contentScriptReady: false,
          mainWorldReady: false,
          appliedManagedScriptIds: []
        }
      : currentState

    if (!state.contentScriptReady) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-script.js']
      })
      state.contentScriptReady = true
    }

    if (!injectBridge) {
      this.tabInjectionState.set(tabId, state)
      return
    }

    if (!state.mainWorldReady) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['injected-main.js'],
        world: 'MAIN'
      })
      state.mainWorldReady = true
    }

    if (routeClient.toolScriptSource.trim()) {
      const managedScriptId = createManagedScriptId(
        `route-tool-script-${routeClient.id}`,
        routeClient.toolScriptSource
      )

      if (!state.appliedManagedScriptIds.includes(managedScriptId)) {
        await this.dispatchPageCommand(tabId, {
          type: 'runMainWorld',
          action: 'runScript',
          args: {
            source: routeClient.toolScriptSource,
            scriptId: managedScriptId
          }
        })
        state.appliedManagedScriptIds.push(managedScriptId)
      }
    }

    this.tabInjectionState.set(tabId, state)
  }

  private async dispatchPageCommand<TResult>(
    tabId: number,
    command: PageCommand
  ): Promise<TResult> {
    const response = (await chrome.tabs.sendMessage(
      tabId,
      {
        channel: PAGE_COMMAND_CHANNEL,
        command
      } satisfies PageCommandEnvelope
    )) as PageCommandResponse<TResult>

    if (!response?.ok) {
      throw new Error(response?.error?.message ?? 'Page command failed')
    }

    return response.data as TResult
  }

  private async sendPageCommand<TResult>(
    tabId: number,
    routeClient: RouteClientConfig,
    command: PageCommand
  ): Promise<TResult> {
    const injectBridge = command.type === 'runMainWorld' || routeClient.autoInjectBridge

    await this.ensureScriptsInjected(tabId, routeClient, injectBridge)

    try {
      return await this.dispatchPageCommand<TResult>(tabId, command)
    } catch {
      this.tabInjectionState.delete(tabId)
      await this.ensureScriptsInjected(tabId, routeClient, injectBridge)
      return this.dispatchPageCommand<TResult>(tabId, command)
    }
  }

  private async listInjectedTools(
    tabId: number,
    routeClient: RouteClientConfig
  ): Promise<InjectedToolDescriptor[]> {
    return this.sendPageCommand(tabId, routeClient, {
      type: 'runMainWorld',
      action: 'listTools'
    })
  }

  private async getMainWorldState(
    tabId: number,
    routeClient: RouteClientConfig
  ): Promise<MainWorldBridgeState> {
    return this.sendPageCommand(tabId, routeClient, {
      type: 'runMainWorld',
      action: 'getState'
    })
  }

  private async safeGetMainWorldState(
    tabId: number
  ): Promise<MainWorldBridgeState | undefined> {
    const activeMatches = (await this.getConfig()).routeClients.filter((client) => client.enabled)
    const activeRoute = activeMatches.at(0)

    if (!activeRoute) {
      return undefined
    }

    try {
      return await this.getMainWorldState(tabId, activeRoute)
    } catch {
      return undefined
    }
  }

  private async persistGrantedActiveTabOrigin(routeClientId: string, pattern: string): Promise<{
    granted: true
    pattern: string
    routeClientId: string
  }> {
    const routeClient = await this.getRouteClient(routeClientId)

    if (!pattern) {
      throw new Error('The active tab URL cannot be converted into a host permission pattern')
    }

    await this.updateRouteClient(routeClient.id, (client) => ({
      ...client,
      matchPatterns: [...new Set([...client.matchPatterns, pattern])]
    }))

    await this.refresh()

    return {
      granted: true,
      pattern,
      routeClientId: routeClient.id
    }
  }

  private async createRouteClientFromActiveTab(clientName?: string): Promise<{
    created: true
    routeClientId: string
    clientName: string
    pattern: string
  }> {
    const tab = await this.resolveTargetTab(undefined)

    if (!tab.url) {
      throw new Error('The active tab does not expose a URL')
    }

    if (!getOriginMatchPattern(tab.url)) {
      throw new Error('Open an http, https, or file page before creating a route client.')
    }

    const config = await this.getConfig()
    const nextClient = createRouteClientFromUrl(tab.url, {
      ...(clientName?.trim() ? { clientName } : {})
    })

    const duplicate = config.routeClients.find(
      (client) =>
        client.matchPatterns.join('\n') === nextClient.matchPatterns.join('\n') &&
        summarizeRouteRules(client) === summarizeRouteRules(nextClient)
    )

    if (duplicate) {
      throw new Error(`A similar route client already exists: ${duplicate.clientName}`)
    }

    this.currentConfig = await saveConfig({
      ...config,
      routeClients: [nextClient, ...config.routeClients]
    })

    await this.refresh()

    return {
      created: true,
      routeClientId: nextClient.id,
      clientName: nextClient.clientName,
      pattern: nextClient.matchPatterns[0] ?? ''
    }
  }

  private async updateRouteClient(
    routeClientId: string,
    updater: (client: RouteClientConfig) => RouteClientConfig
  ): Promise<void> {
    const config = await this.getConfig()
    const nextConfig = {
      ...config,
      routeClients: config.routeClients.map((client) =>
        client.id === routeClientId ? updater(client) : client
      )
    }

    this.currentConfig = await saveConfig(nextConfig)
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== undefined) {
      return
    }

    const config = this.currentConfig

    if (
      !config ||
      (!config.backgroundClient.enabled && !config.routeClients.some((client) => client.enabled))
    ) {
      return
    }

    this.reconnectTimer = globalThis.setTimeout(() => {
      this.reconnectTimer = undefined
      void this.refresh()
    }, RECONNECT_DELAY_MS)
  }
}

function createTransport(serverUrl: string): ClientTransport {
  const protocol = new URL(serverUrl).protocol

  switch (protocol) {
    case 'ws:':
    case 'wss:':
      return new WebSocketClientTransport(serverUrl)
    case 'http:':
    case 'https:':
      return new HttpLoopClientTransport(serverUrl)
    default:
      throw new Error(`Unsupported MDP server protocol: ${protocol}`)
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms)
  })
}

function createRecordingFromCapture(
  routeClient: RouteClientConfig,
  result: PageRecordingResult,
  options: {
    name?: string
    description?: string
  }
): RouteClientRecording {
  const stepPreview = result.steps
    .map((step) => step.type)
    .slice(0, 3)
    .join(' -> ')
  const name = options.name?.trim() || `${routeClient.clientName} Flow ${routeClient.recordings.length + 1}`

  return {
    id: createRequestId('recording'),
    name,
    description: options.description?.trim() || stepPreview || 'Recorded interaction flow.',
    createdAt: result.finishedAt,
    updatedAt: result.finishedAt,
    startUrl: result.url,
    capturedFeatures: result.capturedFeatures,
    steps: result.steps.map((step) => normalizeRecordedAction(step))
  }
}

function normalizeRecordedAction(action: PageRecordedAction) {
  return {
    id: action.id,
    type: action.type,
    selector: action.selector,
    alternativeSelectors: action.alternativeSelectors,
    tagName: action.tagName,
    classes: action.classes,
    timestampOffsetMs: action.timestampOffsetMs,
    ...(action.text ? { text: action.text } : {}),
    ...(action.label ? { label: action.label } : {}),
    ...(action.inputType ? { inputType: action.inputType } : {}),
    ...(action.value !== undefined ? { value: action.value } : {}),
    ...(action.key ? { key: action.key } : {}),
    ...(action.code ? { code: action.code } : {})
  }
}

function createSelectorResource(
  routeClient: RouteClientConfig,
  result: PageSelectorCaptureResult
): RouteSelectorResource {
  return {
    id: createRequestId('selector-resource'),
    name: `${routeClient.clientName} Selector ${routeClient.selectorResources.length + 1}`,
    description: `Captured selector resource for ${result.tagName}.`,
    createdAt: new Date().toISOString(),
    url: result.url,
    selector: result.selector,
    alternativeSelectors: result.alternativeSelectors,
    tagName: result.tagName,
    classes: result.classes,
    ...(result.text ? { text: result.text } : {}),
    attributes: result.attributes
  }
}
