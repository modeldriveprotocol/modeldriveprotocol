import type { MdpClient } from '@modeldriveprotocol/client'
import type {
  InjectedToolDescriptor,
  MainWorldBridgeState,
  PageCommand
} from '#~/page/messages.js'
import type {
  ExtensionConfig,
  RouteClientConfig,
  RouteClientRecording,
  RouteSelectorResource
} from '#~/shared/config.js'
import type { UnknownRecord } from '#~/shared/utils.js'
import { loadConfig } from '#~/shared/storage.js'
import type { ChromeExtensionRuntimeApi } from '#~/background/runtime-api.js'
import type {
  BrowserTabSummary,
  ManagedClientConnectionState,
  PopupState,
  TabInjectionState
} from '#~/background/shared.js'

import {
  activateTab,
  closeTab,
  createTab,
  getActiveTab,
  listGrantedOrigins,
  listTabs,
  openOptionsPage,
  reloadTab,
  resolveTargetTab,
  showNotification
} from './runtime/browser.js'
import {
  getRouteClient,
  refreshRuntime,
  resolvePopupRouteClient,
  scheduleReconnect,
  updateRouteClient
} from './runtime/clients.js'
import { checkMarketSourceUpdatesOnStartup } from './runtime/market-sync.js'
import { handleRuntimeMessage } from './runtime/messages.js'
import {
  dispatchPageCommand,
  ensureScriptsInjected,
  getMainWorldState,
  listInjectedTools,
  safeGetMainWorldState,
  sendPageCommand
} from './runtime/page-commands.js'
import {
  bootstrapOpenTabs,
  ensureAllowedRouteTab,
  getPermissionState,
  requireMatchingActiveTab,
  resolveAllowedPageTabForRouteClient,
  syncContentScriptRegistration
} from './runtime/permissions.js'
import {
  callInjectedToolForRouteClient,
  createRouteClientFromActiveTab,
  getInjectedStateForRouteClient,
  handleSelectorCapturedMessage,
  injectToolScriptForRouteClient,
  listInjectedToolsForRouteClient,
  listRouteRecordings,
  listRouteSelectorResources,
  persistGrantedActiveTabOrigin,
  runPageCommandForRouteClient,
  runRouteRecording,
  startRecording,
  startSelectorCapture,
  stopRecording
} from './runtime/route-sessions.js'
import { getRuntimeStatus } from './runtime/status.js'
import { handleTabRemoved, handleTabUpdated } from './runtime/tab-lifecycle.js'
import type {
  ActiveRecordingSession,
  ManagedClientHandle,
  PendingSelectorCapture,
  SelectorCaptureSession
} from './runtime/types.js'

export class ChromeExtensionRuntime implements ChromeExtensionRuntimeApi {
  currentConfig: ExtensionConfig | undefined
  readonly clients = new Map<string, ManagedClientHandle>()
  readonly clientStates = new Map<string, ManagedClientConnectionState>()
  readonly tabInjectionState = new Map<number, TabInjectionState>()
  refreshPromise: Promise<void> | undefined
  marketSyncCheckPromise: Promise<void> | undefined
  reconnectTimer: ReturnType<typeof globalThis.setTimeout> | undefined
  activeRecording: ActiveRecordingSession | undefined
  selectorCaptureSession: SelectorCaptureSession | undefined
  pendingSelectorCapture: PendingSelectorCapture | undefined

  async initialize() { await this.refresh(); await this.checkMarketSourceUpdatesOnStartup() }
  async refresh() { if (this.refreshPromise) return this.refreshPromise; this.refreshPromise = refreshRuntime(this).finally(() => { this.refreshPromise = undefined }); return this.refreshPromise }
  async checkMarketSourceUpdatesOnStartup() { if (this.marketSyncCheckPromise) return this.marketSyncCheckPromise; this.marketSyncCheckPromise = checkMarketSourceUpdatesOnStartup(this).finally(() => { this.marketSyncCheckPromise = undefined }); return this.marketSyncCheckPromise }
  async getStatus(): Promise<PopupState> { return getRuntimeStatus(this) }
  async getConfig(): Promise<ExtensionConfig> { return this.currentConfig ?? (await loadConfig()) }
  async listGrantedOrigins() { return listGrantedOrigins() }
  async listTabs(options: { windowId?: number; activeOnly?: boolean }): Promise<BrowserTabSummary[]> { return listTabs(this, options) }
  async activateTab(tabId: number): Promise<BrowserTabSummary> { return activateTab(tabId) }
  async reloadTab(args: unknown) { return reloadTab(this, args) }
  async createTab(options: { url: string; active?: boolean }): Promise<BrowserTabSummary> { return createTab(options) }
  async closeTab(args: unknown) { return closeTab(this, args) }
  async showNotification(options: { title?: string; message: string }) { return showNotification(this, options) }
  async openOptionsPage() { return openOptionsPage() }
  async runPageCommandForRouteClient<TResult>(routeClientId: string, args: unknown, command: PageCommand): Promise<TResult> { return runPageCommandForRouteClient(this, routeClientId, args, command) }
  async injectToolScriptForRouteClient(routeClientId: string, input: { tabId?: number; source: string; scriptArgs?: unknown; scriptId?: string; force?: boolean }): Promise<InjectedToolDescriptor[]> { return injectToolScriptForRouteClient(this, routeClientId, input) }
  async getInjectedStateForRouteClient(routeClientId: string, args: unknown): Promise<MainWorldBridgeState> { return getInjectedStateForRouteClient(this, routeClientId, args) }
  async listInjectedToolsForRouteClient(routeClientId: string, args: unknown): Promise<InjectedToolDescriptor[]> { return listInjectedToolsForRouteClient(this, routeClientId, args) }
  async callInjectedToolForRouteClient(routeClientId: string, input: { tabId?: number; name: string; toolArgs?: unknown }): Promise<unknown> { return callInjectedToolForRouteClient(this, routeClientId, input) }
  async getRouteClient(routeClientId: string): Promise<RouteClientConfig> { return getRouteClient(this, routeClientId) }
  async runRouteRecording(routeClientId: string, recordingId: string, args: unknown): Promise<unknown> { return runRouteRecording(this, routeClientId, recordingId, args) }
  async listRouteRecordings(routeClientId: string): Promise<RouteClientRecording[]> { return listRouteRecordings(this, routeClientId) }
  async listRouteSelectorResources(routeClientId: string): Promise<RouteSelectorResource[]> { return listRouteSelectorResources(this, routeClientId) }
  async handleRuntimeMessage(message: UnknownRecord, sender?: chrome.runtime.MessageSender) { return handleRuntimeMessage(this, message, sender) }
  async handleTabUpdated(tabId: number, url: string | undefined) { return handleTabUpdated(this, tabId, url) }
  handleTabRemoved(tabId: number) { handleTabRemoved(this, tabId) }
  async resolvePopupRouteClient(routeClientId?: string) { return resolvePopupRouteClient(this, routeClientId) }
  async startRecording(routeClientId: string) { return startRecording(this, routeClientId) }
  async stopRecording(options: { name?: string; description?: string }) { return stopRecording(this, options) }
  async startSelectorCapture(routeClientId: string) { return startSelectorCapture(this, routeClientId) }
  async handleSelectorCapturedMessage(message: Record<string, unknown>, sender?: chrome.runtime.MessageSender) { return handleSelectorCapturedMessage(this, message, sender) }
  async resolveAllowedPageTabForRouteClient(routeClient: RouteClientConfig, args: unknown) { return resolveAllowedPageTabForRouteClient(this, routeClient, args) }
  async requireMatchingActiveTab(routeClient: RouteClientConfig) { return requireMatchingActiveTab(this, routeClient) }
  async resolveTargetTab(args: unknown) { return resolveTargetTab(this, args) }
  async getActiveTab() { return getActiveTab() }
  async ensureAllowedRouteTab(tab: { id: number; url?: string }, routeClient: RouteClientConfig) { return ensureAllowedRouteTab(this, tab, routeClient) }
  async getPermissionState(patterns: string[]) { return getPermissionState(patterns) }
  async syncContentScriptRegistration(config: ExtensionConfig) { return syncContentScriptRegistration(this, config) }
  async bootstrapOpenTabs(config: ExtensionConfig, grantedPatterns: string[]) { return bootstrapOpenTabs(this, config, grantedPatterns) }
  async ensureScriptsInjected(tabId: number, routeClient: RouteClientConfig, injectBridge: boolean) { return ensureScriptsInjected(this, tabId, routeClient, injectBridge) }
  async dispatchPageCommand<TResult>(tabId: number, command: PageCommand): Promise<TResult> { return dispatchPageCommand(tabId, command) }
  async sendPageCommand<TResult>(tabId: number, routeClient: RouteClientConfig, command: PageCommand): Promise<TResult> { return sendPageCommand(this, tabId, routeClient, command) }
  async listInjectedTools(tabId: number, routeClient: RouteClientConfig): Promise<InjectedToolDescriptor[]> { return listInjectedTools(this, tabId, routeClient) }
  async getMainWorldState(tabId: number, routeClient: RouteClientConfig): Promise<MainWorldBridgeState> { return getMainWorldState(this, tabId, routeClient) }
  async safeGetMainWorldState(tabId: number) { return safeGetMainWorldState(this, tabId) }
  async persistGrantedActiveTabOrigin(routeClientId: string, pattern: string) { return persistGrantedActiveTabOrigin(this, routeClientId, pattern) }
  async createRouteClientFromActiveTab(clientName?: string) { return createRouteClientFromActiveTab(this, clientName) }
  async updateRouteClient(routeClientId: string, updater: (client: RouteClientConfig) => RouteClientConfig) { return updateRouteClient(this, routeClientId, updater) }
  scheduleReconnect() { scheduleReconnect(this) }
}
