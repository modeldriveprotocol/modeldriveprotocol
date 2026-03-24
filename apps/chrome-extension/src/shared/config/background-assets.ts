export interface BackgroundCapabilityDefinition {
  id: string
}

export type BackgroundCapabilityKind = 'tool' | 'resource' | 'skill'

export interface BackgroundCapabilityToggleState {
  disabledTools?: string[]
  disabledResources?: string[]
  disabledSkills?: string[]
}

export const BACKGROUND_TOOL_DEFINITIONS: BackgroundCapabilityDefinition[] = [
  { id: 'extension.getStatus' },
  { id: 'extension.getConfig' },
  { id: 'extension.listGrantedOrigins' },
  { id: 'extension.listTabs' },
  { id: 'extension.activateTab' },
  { id: 'extension.reloadTab' },
  { id: 'extension.createTab' },
  { id: 'extension.closeTab' },
  { id: 'extension.showNotification' },
  { id: 'extension.openOptionsPage' }
]

export const BACKGROUND_RESOURCE_DEFINITIONS: BackgroundCapabilityDefinition[] = [
  { id: 'chrome-extension://status' },
  { id: 'chrome-extension://config' },
  { id: 'chrome-extension://tabs' }
]

export const BACKGROUND_SKILL_DEFINITIONS: BackgroundCapabilityDefinition[] = []

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
