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
  PAGE_COMMAND_CHANNEL
} from '../page/messages.js'
import { type ExtensionConfig, getOriginMatchPattern, matchesAnyPattern, normalizeConfig } from '../shared/config.js'
import { loadConfig, patchConfig } from '../shared/storage.js'
import {
  type UnknownRecord,
  asRecord,
  createRequestId,
  readBoolean,
  readNumber,
  readString,
  serializeError
} from '../shared/utils.js'
import { registerBackgroundCapabilities } from './capabilities/index.js'
import type { ChromeExtensionRuntimeApi, ConnectionConfigPatch } from './runtime-api.js'
import {
  type BrowserTabSummary,
  type ConnectionState,
  type PopupState,
  type TabInjectionState,
  createManagedScriptId,
  createNotificationIcon,
  serializeTab
} from './shared.js'

const CONTENT_SCRIPT_ID = 'mdp-chrome-extension-content'
const RECONNECT_DELAY_MS = 5_000

export class ChromeExtensionRuntime implements ChromeExtensionRuntimeApi {
  private client: MdpClient | undefined
  private currentConfig: ExtensionConfig | undefined
  private connectionState: ConnectionState = 'idle'
  private lastError: string | undefined
  private lastConnectedAt: string | undefined
  private reconnectTimer: ReturnType<typeof globalThis.setTimeout> | undefined
  private refreshPromise: Promise<void> | undefined
  private readonly tabInjectionState = new Map<number, TabInjectionState>()

  async initialize(): Promise<void> {
    await this.refresh()
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
    const permissionState = await this.getPermissionState(config.matchPatterns)
    const activeTab = await this.getActiveTab()
    const activeOriginPattern = typeof activeTab?.url === 'string' ? getOriginMatchPattern(activeTab.url) : undefined
    const bridgeState = typeof activeTab?.id === 'number' &&
        typeof activeTab.url === 'string' &&
        matchesAnyPattern(activeTab.url, permissionState.granted)
      ? await this.safeGetMainWorldState(activeTab.id)
      : undefined

    return {
      connectionState: this.connectionState,
      ...(this.lastError ? { lastError: this.lastError } : {}),
      ...(this.lastConnectedAt ? { lastConnectedAt: this.lastConnectedAt } : {}),
      config,
      grantedOrigins: permissionState.granted,
      missingMatchPatterns: permissionState.missing,
      ...(activeOriginPattern ? { activeOriginPattern } : {}),
      ...(bridgeState ? { bridgeState } : {}),
      ...(activeTab && typeof activeTab.id === 'number'
        ? {
          activeTab: {
            id: activeTab.id,
            ...(typeof activeTab.title === 'string' ? { title: activeTab.title } : {}),
            ...(typeof activeTab.url === 'string' ? { url: activeTab.url } : {}),
            ...(typeof activeTab.status === 'string' ? { status: activeTab.status } : {}),
            active: Boolean(activeTab.active),
            eligible: Boolean(
              typeof activeTab.url === 'string' &&
                matchesAnyPattern(activeTab.url, permissionState.granted)
            )
          }
        }
        : {}),
      injectedTools: bridgeState?.tools ?? []
    }
  }

  async getConfig(): Promise<ExtensionConfig> {
    return this.currentConfig ?? (await loadConfig())
  }

  async updateConnectionConfig(patch: ConnectionConfigPatch): Promise<PopupState> {
    this.currentConfig = await patchConfig({
      ...(patch.serverUrl ? { serverUrl: patch.serverUrl } : {}),
      ...(patch.clientId ? { clientId: patch.clientId } : {}),
      ...(patch.clientName ? { clientName: patch.clientName } : {}),
      ...(patch.clientDescription ? { clientDescription: patch.clientDescription } : {}),
      ...(patch.autoConnect !== undefined ? { autoConnect: patch.autoConnect } : {}),
      ...(patch.autoInjectBridge !== undefined
        ? { autoInjectBridge: patch.autoInjectBridge }
        : {})
    })

    await this.refresh()
    return this.getStatus()
  }

  async setDefaultToolScript(toolScriptSource: string): Promise<{
    updated: true
    toolScriptSourceLength: number
  }> {
    this.currentConfig = await patchConfig({
      toolScriptSource
    })

    await this.refresh()
    return {
      updated: true,
      toolScriptSourceLength: toolScriptSource.length
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

  async runPageCommand<TResult>(
    args: unknown,
    command: PageCommand
  ): Promise<TResult> {
    const tab = await this.resolveAllowedPageTab(args)
    return this.sendPageCommand<TResult>(tab.id, command)
  }

  async injectToolScript(input: {
    tabId?: number
    source: string
    scriptArgs?: unknown
    scriptId?: string
    force?: boolean
  }): Promise<InjectedToolDescriptor[]> {
    const tab = await this.resolveAllowedPageTab(input)
    const config = await this.getConfig()
    const scriptId = input.scriptId ?? createManagedScriptId('page-tool', input.source)

    await this.ensureScriptsInjected(tab.id, config, true)
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

    return this.listInjectedTools(tab.id)
  }

  async getInjectedState(args: unknown): Promise<MainWorldBridgeState> {
    const tab = await this.resolveAllowedPageTab(args)
    return this.getMainWorldState(tab.id)
  }

  async listInjectedToolsForArgs(args: unknown): Promise<InjectedToolDescriptor[]> {
    const tab = await this.resolveAllowedPageTab(args)
    return this.listInjectedTools(tab.id)
  }

  async callInjectedTool(input: {
    tabId?: number
    name: string
    toolArgs?: unknown
  }): Promise<unknown> {
    const tab = await this.resolveAllowedPageTab(input)
    return this.sendPageCommand(tab.id, {
      type: 'runMainWorld',
      action: 'invokeTool',
      args: {
        name: input.name,
        ...(input.toolArgs !== undefined ? { toolArgs: input.toolArgs } : {})
      }
    })
  }

  async handlePopupMessage(message: UnknownRecord): Promise<unknown> {
    const type = readString(message, 'type')

    switch (type) {
      case 'popup:getState':
        return this.getStatus()
      case 'popup:openOptions':
        return this.openOptionsPage()
      case 'popup:injectActiveTab': {
        const tab = await this.requireActiveTab()
        const config = await this.getConfig()
        await this.ensureAllowedTab(tab, config)
        await this.ensureScriptsInjected(tab.id, config, true)
        return {
          injected: true,
          tabId: tab.id
        }
      }
      case 'popup:grantActiveTabOrigin':
        return this.grantActiveTabOrigin()
      case 'runtime:refresh':
        await this.refresh()
        return { refreshed: true }
      case 'runtime:getStatus':
        return this.getStatus()
      default:
        return undefined
    }
  }

  async handleTabUpdated(tabId: number, url: string | undefined): Promise<void> {
    const config = await this.getConfig()
    const permissionState = await this.getPermissionState(config.matchPatterns)
    const existingState = this.tabInjectionState.get(tabId)

    if (existingState && existingState.url !== url) {
      this.tabInjectionState.delete(tabId)
    }

    if (url && matchesAnyPattern(url, permissionState.granted)) {
      await this.ensureScriptsInjected(tabId, config, config.autoInjectBridge)
    }
  }

  handleTabRemoved(tabId: number): void {
    this.tabInjectionState.delete(tabId)
  }

  private async doRefresh(): Promise<void> {
    const config = await loadConfig()
    const normalized = normalizeConfig(config)
    const permissionState = await this.syncContentScriptRegistration(normalized)

    this.currentConfig = normalized
    await this.bootstrapOpenTabs(normalized, permissionState.granted)

    if (!normalized.autoConnect) {
      await this.disconnectClient()
      this.connectionState = 'disabled'
      this.lastError = undefined
      return
    }

    await this.connectClient(normalized)
  }

  private async connectClient(config: ExtensionConfig): Promise<void> {
    if (this.client) {
      await this.disconnectClient()
    }

    this.connectionState = 'connecting'
    this.lastError = undefined

    try {
      const transport = createTransport(config.serverUrl)
      transport.onClose(() => {
        this.connectionState = 'idle'
        this.scheduleReconnect()
      })

      const manifest = chrome.runtime.getManifest()
      const client = createMdpClient({
        serverUrl: config.serverUrl,
        transport,
        client: {
          id: config.clientId,
          name: config.clientName,
          description: config.clientDescription,
          version: manifest.version,
          platform: 'chrome-extension',
          metadata: {
            manifestVersion: manifest.manifest_version,
            extensionId: chrome.runtime.id
          }
        }
      })

      registerBackgroundCapabilities(client, this)
      await client.connect()
      client.register()
      this.client = client
      this.connectionState = 'connected'
      this.lastConnectedAt = new Date().toISOString()
    } catch (error) {
      await this.disconnectClient()
      this.connectionState = 'error'
      this.lastError = serializeError(error).message
      this.scheduleReconnect()
    }
  }

  private async resolveAllowedPageTab(args: unknown): Promise<{
    id: number
    url?: string
    title?: string
    active: boolean
  }> {
    const tab = await this.resolveTargetTab(args)
    const config = await this.getConfig()
    await this.ensureAllowedTab(tab, config)
    return tab
  }

  private async resolveTargetTab(args: unknown): Promise<{
    id: number
    url?: string
    title?: string
    active: boolean
  }> {
    const tabId = readNumber(asRecord(args), 'tabId')

    if (tabId !== undefined) {
      const tab = await chrome.tabs.get(tabId)

      if (typeof tab.id !== 'number') {
        throw new Error(`Unknown tab ${tabId}`)
      }

      return {
        id: tab.id,
        ...(typeof tab.url === 'string' ? { url: tab.url } : {}),
        ...(typeof tab.title === 'string' ? { title: tab.title } : {}),
        active: Boolean(tab.active)
      }
    }

    return this.requireActiveTab()
  }

  private async requireActiveTab(): Promise<{
    id: number
    url?: string
    title?: string
    active: boolean
  }> {
    const tab = await this.getActiveTab()

    if (!tab || typeof tab.id !== 'number') {
      throw new Error('No active tab is available')
    }

    return {
      id: tab.id,
      ...(typeof tab.url === 'string' ? { url: tab.url } : {}),
      ...(typeof tab.title === 'string' ? { title: tab.title } : {}),
      active: Boolean(tab.active)
    }
  }

  private async getActiveTab(): Promise<BrowserTabSummary | undefined> {
    const tabs = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true
    })

    const activeTab = tabs.at(0)
    return activeTab ? serializeTab(activeTab) : undefined
  }

  private async ensureAllowedTab(
    tab: { id: number; url?: string },
    config: ExtensionConfig
  ): Promise<void> {
    if (!tab.url) {
      throw new Error('Target tab does not expose a URL')
    }

    const permissionState = await this.getPermissionState(config.matchPatterns)

    if (!matchesAnyPattern(tab.url, permissionState.granted)) {
      throw new Error(
        'Target tab URL is not covered by the configured and granted match patterns'
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
    const permissionState = await this.getPermissionState(config.matchPatterns)

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
        if (
          typeof tab.id === 'number' &&
          typeof tab.url === 'string' &&
          matchesAnyPattern(tab.url, grantedPatterns)
        ) {
          try {
            await this.ensureScriptsInjected(tab.id, config, config.autoInjectBridge)
          } catch {
            // Ignore tabs that cannot be scripted.
          }
        }
      })
    )
  }

  private async ensureScriptsInjected(
    tabId: number,
    config: ExtensionConfig,
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

    if (config.toolScriptSource.trim()) {
      const managedScriptId = createManagedScriptId(
        'default-tool-script',
        config.toolScriptSource
      )

      if (!state.appliedManagedScriptIds.includes(managedScriptId)) {
        await this.dispatchPageCommand(tabId, {
          type: 'runMainWorld',
          action: 'runScript',
          args: {
            source: config.toolScriptSource,
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
    command: PageCommand
  ): Promise<TResult> {
    const config = await this.getConfig()
    const injectBridge = command.type === 'runMainWorld' || config.autoInjectBridge

    await this.ensureScriptsInjected(tabId, config, injectBridge)

    try {
      return await this.dispatchPageCommand<TResult>(tabId, command)
    } catch {
      this.tabInjectionState.delete(tabId)
      await this.ensureScriptsInjected(tabId, config, injectBridge)
      return this.dispatchPageCommand<TResult>(tabId, command)
    }
  }

  private async listInjectedTools(tabId: number): Promise<InjectedToolDescriptor[]> {
    return this.sendPageCommand<InjectedToolDescriptor[]>(tabId, {
      type: 'runMainWorld',
      action: 'listTools'
    })
  }

  private async getMainWorldState(tabId: number): Promise<MainWorldBridgeState> {
    return this.sendPageCommand<MainWorldBridgeState>(tabId, {
      type: 'runMainWorld',
      action: 'getState'
    })
  }

  private async safeGetMainWorldState(
    tabId: number
  ): Promise<MainWorldBridgeState | undefined> {
    try {
      return await this.getMainWorldState(tabId)
    } catch {
      return undefined
    }
  }

  private async grantActiveTabOrigin(): Promise<{
    granted: boolean
    pattern: string
  }> {
    const tab = await this.requireActiveTab()
    const pattern = getOriginMatchPattern(tab.url)

    if (!pattern) {
      throw new Error('The active tab URL cannot be converted into a host permission pattern')
    }

    const granted = (await chrome.permissions.request({
      origins: [pattern]
    })) as boolean

    if (!granted) {
      throw new Error(`Host permission request was denied for ${pattern}`)
    }

    const config = await this.getConfig()

    if (!config.matchPatterns.includes(pattern)) {
      this.currentConfig = await patchConfig({
        matchPatterns: [...new Set([...config.matchPatterns, pattern])]
      })
    }

    await this.refresh()

    return {
      granted: true,
      pattern
    }
  }

  private scheduleReconnect(): void {
    if (!this.currentConfig?.autoConnect || this.reconnectTimer !== undefined) {
      return
    }

    this.reconnectTimer = globalThis.setTimeout(() => {
      this.reconnectTimer = undefined
      void this.refresh()
    }, RECONNECT_DELAY_MS)
  }

  private async disconnectClient(): Promise<void> {
    if (this.reconnectTimer !== undefined) {
      globalThis.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }

    if (!this.client) {
      return
    }

    try {
      await this.client.disconnect()
    } catch {
      // Best effort shutdown.
    } finally {
      this.client = undefined
    }
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
