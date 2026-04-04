import type {
  BackgroundClientConfig,
  ClientIconKey,
  ExtensionConfig,
  RoutePathRule,
  RouteRuleMode,
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

export interface WorkspaceClientTargetInput {
  kind?: 'background' | 'route'
  id?: string
  clientId?: string
}

export interface WorkspaceClientCreateInput {
  kind: 'background' | 'route'
  id?: string
  clientId?: string
  clientName?: string
  clientDescription?: string
  icon?: ClientIconKey
  enabled?: boolean
  favorite?: boolean
  matchPatterns?: string[]
  autoInjectBridge?: boolean
  pathScriptSource?: string
  disabledExposePaths?: string[]
  disabledTools?: string[]
  disabledResources?: string[]
  disabledSkills?: string[]
}

export interface WorkspaceClientUpdateInput extends WorkspaceClientTargetInput {
  clientName?: string
  clientDescription?: string
  icon?: ClientIconKey
  enabled?: boolean
  favorite?: boolean
  nextClientId?: string
  matchPatterns?: string[]
  autoInjectBridge?: boolean
  pathScriptSource?: string
  disabledExposePaths?: string[]
  disabledTools?: string[]
  disabledResources?: string[]
  disabledSkills?: string[]
}

export interface WorkspaceClientExposeRuleInput extends WorkspaceClientTargetInput {
  mode?: RouteRuleMode
  value: string
  prepend?: boolean
}

export interface WorkspaceClientsSnapshot {
  backgroundClients: BackgroundClientConfig[]
  routeClients: RouteClientConfig[]
}

export interface WorkspaceClientMutationResult<TClient> {
  client: TClient
}

export interface WorkspaceClientDeleteResult {
  client: {
    kind: 'background' | 'route'
    id: string
    clientId: string
    clientName: string
  }
}

export interface WorkspaceClientExposeRuleResult {
  client: RouteClientConfig
  routeRule: RoutePathRule
  duplicate: boolean
}

export interface ChromeExtensionRuntimeApi {
  getStatus(): Promise<PopupState>
  getConfig(): Promise<ExtensionConfig>
  listWorkspaceClients(): Promise<WorkspaceClientsSnapshot>
  createWorkspaceClient(
    input: WorkspaceClientCreateInput
  ): Promise<WorkspaceClientMutationResult<BackgroundClientConfig | RouteClientConfig>>
  updateWorkspaceClient(
    input: WorkspaceClientUpdateInput
  ): Promise<WorkspaceClientMutationResult<BackgroundClientConfig | RouteClientConfig>>
  deleteWorkspaceClient(
    input: WorkspaceClientTargetInput
  ): Promise<WorkspaceClientDeleteResult>
  addExposeRuleToClient(
    input: WorkspaceClientExposeRuleInput
  ): Promise<WorkspaceClientExposeRuleResult>
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
