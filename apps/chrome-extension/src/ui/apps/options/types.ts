import type { ReactNode } from 'react'

import type { BackgroundClientConfig, ClientIconKey, MarketSourceProvider, MarketSourceRefType } from '#~/shared/config.js'
import type { OptionsAssetsTab } from '../../platform/extension-api.js'

export type Section = 'workspace' | 'settings' | 'clients' | 'market'
export type TransferMode = 'import' | 'export'
export type ClientDetailTab = 'basics' | 'matching' | 'runtime' | 'assets' | 'activity'
export type EditableClientId = string

export type MarketSourceDraftInput =
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

export type ImportSourceDraftInput =
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

export type OptionsRouteState = {
  assetTab?: OptionsAssetsTab
  assetPath?: string
  clientDetailOpen: boolean
  clientId?: EditableClientId
  detailTab?: ClientDetailTab
  marketDetailOpen: boolean
  marketEntryKey?: string
  section: Section
  sidebarCollapsed: boolean
}

export const ICON_OPTIONS: ClientIconKey[] = [
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

export const SECTION_IDS: Section[] = ['workspace', 'settings', 'clients', 'market']

export type NavItem = {
  id: Section
  label: string
  icon: ReactNode
}

export function createLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function uniqueEditableIds(values: EditableClientId[]): EditableClientId[] {
  return values.filter((value, index) => values.indexOf(value) === index)
}

export function formatSurfaceUrlLabel(url: string | undefined): string | undefined {
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

export function isBackgroundClientConfig(
  value: BackgroundClientConfig | unknown
): value is BackgroundClientConfig {
  return Boolean(value && typeof value === 'object' && 'clientId' in value)
}
