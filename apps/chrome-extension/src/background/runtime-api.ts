import type {
  ExtensionConfig,
  RouteClientConfig,
  RouteClientRecording,
  RouteSelectorResource
} from '#~/shared/config.js'
import type {
  InjectedPathDescriptor,
  MainWorldBridgeState,
  PageCommand
} from '#~/page/messages.js'
import type { BrowserTabSummary, PopupState } from './shared.js'

export interface ChromeExtensionRuntimeApi {
  getStatus(): Promise<PopupState>
  getConfig(): Promise<ExtensionConfig>
  listGrantedOrigins(): Promise<unknown>
  listTabs(options: { windowId?: number; activeOnly?: boolean }): Promise<BrowserTabSummary[]>
  activateTab(tabId: number): Promise<BrowserTabSummary>
  reloadTab(args: unknown): Promise<{
    reloaded: true
    tab: BrowserTabSummary
  }>
  createTab(options: { url: string; active?: boolean }): Promise<BrowserTabSummary>
  closeTab(args: unknown): Promise<{
    closed: true
    tabId: number
  }>
  showNotification(options: {
    title?: string
    message: string
  }): Promise<{
    shown: true
    notificationId: string
  }>
  openOptionsPage(): Promise<{
    opened: true
  }>
  runPageCommandForRouteClient<TResult>(
    routeClientId: string,
    args: unknown,
    command: PageCommand
  ): Promise<TResult>
  injectPathScriptForRouteClient(
    routeClientId: string,
    input: {
      tabId?: number
      source: string
      scriptArgs?: unknown
      scriptId?: string
      force?: boolean
    }
  ): Promise<InjectedPathDescriptor[]>
  getInjectedStateForRouteClient(
    routeClientId: string,
    args: unknown
  ): Promise<MainWorldBridgeState>
  listInjectedPathsForRouteClient(
    routeClientId: string,
    args: unknown
  ): Promise<InjectedPathDescriptor[]>
  callInjectedPathForRouteClient(
    routeClientId: string,
    input: {
      tabId?: number
      path: string
      pathArgs?: unknown
    }
  ): Promise<unknown>
  getRouteClient(routeClientId: string): Promise<RouteClientConfig>
  runRouteRecording(
    routeClientId: string,
    recordingId: string,
    args: unknown
  ): Promise<unknown>
  listRouteRecordings(routeClientId: string): Promise<RouteClientRecording[]>
  listRouteSelectorResources(routeClientId: string): Promise<RouteSelectorResource[]>
}
