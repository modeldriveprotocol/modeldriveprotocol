import {
  BACKGROUND_BROWSER_EXPOSE_PATHS,
  BACKGROUND_BROWSER_SKILL_EXPOSE_PATHS,
  BACKGROUND_SKILL_EXPOSE_PATHS,
  BACKGROUND_WORKSPACE_SKILL_EXPOSE_PATHS,
  BACKGROUND_WORKSPACE_EXPOSE_PATHS,
  createBackgroundExposeAssets,
  type BackgroundExposeAsset
} from './background-assets.js'

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

export type RouteRuleMode =
  | 'pathname-prefix'
  | 'pathname-exact'
  | 'url-contains'
  | 'regex'

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
  kind: 'flow'
  id: string
  path: string
  name: string
  description: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  mode: 'recording' | 'script'
  createdAt: string
  updatedAt: string
  startUrl?: string
  capturedFeatures: string[]
  steps: RecordedFlowStep[]
  scriptSource: string
}

export interface SelectorResourceAttributeMap {
  [key: string]: string
}

export interface RouteSelectorResource {
  kind: 'resource'
  id: string
  path: string
  name: string
  description: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  createdAt: string
  url?: string
  selector: string
  alternativeSelectors: string[]
  tagName: string
  classes: string[]
  text?: string
  attributes: SelectorResourceAttributeMap
  scriptSource?: string
}

export type RouteSkillParameterType = 'string' | 'number' | 'boolean'

export interface RouteSkillParameter {
  id: string
  key: string
  summary: string
  type: RouteSkillParameterType
}

export interface RouteSkillMetadata {
  title: string
  summary: string
  queryParameters: RouteSkillParameter[]
  headerParameters: RouteSkillParameter[]
}

export interface RouteSkillEntry {
  kind: 'skill'
  id: string
  path: string
  metadata: RouteSkillMetadata
  content: string
}

export interface RouteSkillFolder {
  kind: 'folder'
  id: string
  path: string
}

export type RouteExposeAsset =
  | RouteClientRecording
  | RouteSelectorResource
  | RouteSkillEntry
  | RouteSkillFolder

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
  id: string
  enabled: boolean
  favorite: boolean
  clientId: string
  clientName: string
  clientDescription: string
  icon: ClientIconKey
  exposes: BackgroundExposeAsset[]
  disabledExposePaths: string[]
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
  pathScriptSource: string
  exposes: RouteExposeAsset[]
  recordings: RouteClientRecording[]
  selectorResources: RouteSelectorResource[]
  skillFolders: RouteSkillFolder[]
  skillEntries: RouteSkillEntry[]
  installSource?: MarketClientInstallSource
}

export interface ExtensionConfig {
  version: string
  serverUrl: string
  notificationTitle: string
  backgroundClients: BackgroundClientConfig[]
  routeClients: RouteClientConfig[]
  marketSources: MarketSourceConfig[]
  marketAutoCheckUpdates: boolean
}

export const STORAGE_KEY = 'extensionWorkspaceConfig'
export const SUPPORTED_MARKET_CATALOG_VERSION = '1.0.0'
export const SUPPORTED_WORKSPACE_BUNDLE_VERSION = '1.0.0'
export const MARKET_CATALOG_SYNC_PATH =
  'apps/chrome-extension/official-market/catalog.json'
export const WORKSPACE_BUNDLE_SYNC_PATH =
  'apps/chrome-extension/official-workspace/workspace.json'

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
  id: 'background-client-default',
  enabled: true,
  favorite: false,
  clientId: 'mdp-chrome-background',
  clientName: 'MDP Chrome Background',
  clientDescription:
    'Chrome extension runtime that exposes browser-level capabilities through Model Drive Protocol.',
  icon: 'chrome',
  exposes: createBackgroundExposeAssets([
    ...BACKGROUND_WORKSPACE_EXPOSE_PATHS,
    ...BACKGROUND_SKILL_EXPOSE_PATHS.filter(
      (path) => !BACKGROUND_BROWSER_SKILL_EXPOSE_PATHS.includes(path)
    )
  ]),
  disabledExposePaths: [
    ...BACKGROUND_WORKSPACE_EXPOSE_PATHS,
    ...BACKGROUND_SKILL_EXPOSE_PATHS.filter(
      (path) => !BACKGROUND_BROWSER_SKILL_EXPOSE_PATHS.includes(path)
    )
  ]
}

export const DEFAULT_WORKSPACE_MANAGEMENT_CLIENT: BackgroundClientConfig = {
  kind: 'background',
  id: 'background-client-workspace',
  enabled: true,
  favorite: false,
  clientId: 'mdp-chrome-workspace',
  clientName: 'MDP Chrome Workspace',
  clientDescription:
    'Chrome extension workspace manager that can create, update, and remove clients and persist route expose rules.',
  icon: 'layers',
  exposes: createBackgroundExposeAssets([
    ...BACKGROUND_BROWSER_EXPOSE_PATHS,
    ...BACKGROUND_SKILL_EXPOSE_PATHS.filter(
      (path) => !BACKGROUND_WORKSPACE_SKILL_EXPOSE_PATHS.includes(path)
    )
  ]),
  disabledExposePaths: [
    ...BACKGROUND_BROWSER_EXPOSE_PATHS,
    ...BACKGROUND_SKILL_EXPOSE_PATHS.filter(
      (path) => !BACKGROUND_WORKSPACE_SKILL_EXPOSE_PATHS.includes(path)
    )
  ]
}

export const DEFAULT_BACKGROUND_CLIENTS: BackgroundClientConfig[] = [
  DEFAULT_BACKGROUND_CLIENT,
  DEFAULT_WORKSPACE_MANAGEMENT_CLIENT
]

export function isRequiredBackgroundClientId(id: string): boolean {
  return id === DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.id
}

export const DEFAULT_EXTENSION_CONFIG: ExtensionConfig = {
  version: SUPPORTED_WORKSPACE_BUNDLE_VERSION,
  serverUrl: 'ws://127.0.0.1:47372',
  notificationTitle: 'Model Drive Protocol for Chrome',
  backgroundClients: DEFAULT_BACKGROUND_CLIENTS.map((client) => ({
    ...client,
    exposes: client.exposes.map((asset) => ({ ...asset })),
    disabledExposePaths: [...client.disabledExposePaths]
  })),
  routeClients: [],
  marketSources: [DEFAULT_OFFICIAL_MARKET_SOURCE],
  marketAutoCheckUpdates: true
}
