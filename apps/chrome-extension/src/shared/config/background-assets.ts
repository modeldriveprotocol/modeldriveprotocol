export interface BackgroundCapabilityDefinition {
  id: string
}

export type BackgroundCapabilityKind = 'tool' | 'resource' | 'skill'

export interface BackgroundCapabilityToggleState {
  disabledTools?: string[]
  disabledResources?: string[]
  disabledSkills?: string[]
}

export const BACKGROUND_BROWSER_TOOL_IDS = [
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
] as const

export const BACKGROUND_WORKSPACE_TOOL_IDS = [
  'extension.listClients',
  'extension.createClient',
  'extension.updateClient',
  'extension.deleteClient',
  'extension.addClientExposeRule'
] as const

export const BACKGROUND_RESOURCE_IDS = [
  'chrome-extension://status',
  'chrome-extension://config',
  'chrome-extension://tabs'
] as const

export const BACKGROUND_SKILL_IDS = [
  'extension.manageClients',
  'extension.manageClientExposeRules'
] as const

export const BACKGROUND_TOOL_DEFINITIONS: BackgroundCapabilityDefinition[] = [
  ...BACKGROUND_BROWSER_TOOL_IDS,
  ...BACKGROUND_WORKSPACE_TOOL_IDS
].map((id) => ({ id }))

export const BACKGROUND_RESOURCE_DEFINITIONS: BackgroundCapabilityDefinition[] =
  BACKGROUND_RESOURCE_IDS.map((id) => ({ id }))

export const BACKGROUND_SKILL_DEFINITIONS: BackgroundCapabilityDefinition[] =
  BACKGROUND_SKILL_IDS.map((id) => ({ id }))

export function listBackgroundCapabilityIds(kind: BackgroundCapabilityKind): string[] {
  switch (kind) {
    case 'tool':
      return BACKGROUND_TOOL_DEFINITIONS.map((definition) => definition.id)
    case 'resource':
      return BACKGROUND_RESOURCE_DEFINITIONS.map((definition) => definition.id)
    case 'skill':
      return BACKGROUND_SKILL_DEFINITIONS.map((definition) => definition.id)
  }
}

export function normalizeDisabledBackgroundCapabilities(
  kind: BackgroundCapabilityKind,
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const allowedIds = new Set(listBackgroundCapabilityIds(kind))
  const normalized: string[] = []

  for (const item of value) {
    if (typeof item !== 'string') {
      continue
    }

    const id = item.trim()

    if (!id || !allowedIds.has(id) || normalized.includes(id)) {
      continue
    }

    normalized.push(id)
  }

  return normalized
}

export function isBackgroundCapabilityEnabled(
  config: BackgroundCapabilityToggleState,
  kind: BackgroundCapabilityKind,
  id: string
): boolean {
  switch (kind) {
    case 'tool':
      return !config.disabledTools?.includes(id)
    case 'resource':
      return !config.disabledResources?.includes(id)
    case 'skill':
      return !config.disabledSkills?.includes(id)
  }
}

export function countEnabledBackgroundCapabilities(
  config: BackgroundCapabilityToggleState,
  kind: BackgroundCapabilityKind
): number {
  return listBackgroundCapabilityIds(kind).filter((id) =>
    isBackgroundCapabilityEnabled(config, kind, id)
  ).length
}
