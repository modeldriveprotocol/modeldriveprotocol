export type ClientIconKey =
  | 'chrome'
  | 'route'
  | 'robot'
  | 'code'
  | 'layers'
  | 'insights'
  | 'spark'
  | 'javascript'
  | 'html'
  | 'css'

export type RouteRuleMode = 'pathname-prefix' | 'pathname-exact' | 'url-contains' | 'regex'

export interface RoutePathRule {
  id: string
  mode: RouteRuleMode
  value: string
}

export interface RecordedFlowStep {
  id: string
  type: 'click' | 'fill' | 'pressKey'
  selector: string
  alternativeSelectors: string[]
  tagName: string
  classes: string[]
  timestampOffsetMs: number
  text?: string
  label?: string
  inputType?: string
  value?: string
  key?: string
  code?: string
}

export interface RouteClientRecording {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  startUrl?: string
  capturedFeatures: string[]
  steps: RecordedFlowStep[]
}

export interface SelectorResourceAttributeMap {
  [key: string]: string
}

export interface RouteSelectorResource {
  id: string
  name: string
  description: string
  createdAt: string
  url?: string
  selector: string
  alternativeSelectors: string[]
  tagName: string
  classes: string[]
  text?: string
  attributes: SelectorResourceAttributeMap
}

export interface RouteSkillEntry {
  id: string
  path: string
  title: string
  summary: string
  icon: ClientIconKey
  content: string
}

export interface MarketSourceConfig {
  id: string
  kind: MarketSourceKind
  url: string
  provider?: MarketSourceProvider
  repository?: string
  refType?: MarketSourceRefType
  ref?: string
  official?: boolean
}

export type MarketSourceKind = 'direct' | 'repository'
export type MarketSourceProvider = 'github' | 'gitlab'
export type MarketSourceRefType = 'branch' | 'tag' | 'commit'

export interface MarketClientInstallSource {
  type: 'market'
  sourceId: string
  sourceUrl: string
  marketClientId: string
  marketVersion: string
  installedAt: string
}

export interface BackgroundClientConfig {
  kind: 'background'
  enabled: boolean
  favorite: boolean
  clientId: string
  clientName: string
  clientDescription: string
  icon: ClientIconKey
}

export interface RouteClientConfig {
  kind: 'route'
  id: string
  enabled: boolean
  favorite: boolean
  clientId: string
  clientName: string
  clientDescription: string
  icon: ClientIconKey
  matchPatterns: string[]
  routeRules: RoutePathRule[]
  autoInjectBridge: boolean
  toolScriptSource: string
  recordings: RouteClientRecording[]
  selectorResources: RouteSelectorResource[]
  skillEntries: RouteSkillEntry[]
  installSource?: MarketClientInstallSource
}

export interface ExtensionConfig {
  version: string
  serverUrl: string
  notificationTitle: string
  backgroundClient: BackgroundClientConfig
  routeClients: RouteClientConfig[]
  marketSources: MarketSourceConfig[]
  marketAutoCheckUpdates: boolean
}

export const STORAGE_KEY = 'extensionWorkspaceConfig'
export const SUPPORTED_MARKET_CATALOG_VERSION = '1.0.0'
export const SUPPORTED_WORKSPACE_BUNDLE_VERSION = '1.0.0'
export const MARKET_CATALOG_SYNC_PATH = 'apps/chrome-extension/official-market/catalog.json'
export const WORKSPACE_BUNDLE_SYNC_PATH = 'apps/chrome-extension/official-workspace/workspace.json'

export const DEFAULT_OFFICIAL_MARKET_SOURCE: MarketSourceConfig = {
  id: 'market-source-official',
  kind: 'repository',
  provider: 'github',
  repository: 'modeldriveprotocol/modeldriveprotocol',
  refType: 'branch',
  ref: 'main',
  url: 'https://raw.githubusercontent.com/modeldriveprotocol/modeldriveprotocol/main/apps/chrome-extension/official-market/catalog.json',
  official: true
}

export const DEFAULT_BACKGROUND_CLIENT: BackgroundClientConfig = {
  kind: 'background',
  enabled: true,
  favorite: false,
  clientId: 'mdp-chrome-background',
  clientName: 'MDP Chrome Background',
  clientDescription: 'Chrome extension runtime that exposes browser-level capabilities through Model Drive Protocol.',
  icon: 'chrome'
}

export const DEFAULT_EXTENSION_CONFIG: ExtensionConfig = {
  version: SUPPORTED_WORKSPACE_BUNDLE_VERSION,
  serverUrl: 'ws://127.0.0.1:47372',
  notificationTitle: 'Model Drive Protocol for Chrome',
  backgroundClient: DEFAULT_BACKGROUND_CLIENT,
  routeClients: [],
  marketSources: [DEFAULT_OFFICIAL_MARKET_SOURCE],
  marketAutoCheckUpdates: true
}
