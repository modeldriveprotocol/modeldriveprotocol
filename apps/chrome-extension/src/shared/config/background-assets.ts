export type BackgroundExposeKind = 'endpoint' | 'skill'
export type BackgroundExposeGroup = 'browser' | 'workspace' | 'skill'

export interface BackgroundExposeDefinition {
  path: string
  kind: BackgroundExposeKind
  group: BackgroundExposeGroup
  description: string
  method?: 'GET' | 'POST'
  contentType?: string
  legacyId?: string
}

export interface BackgroundExposeToggleState {
  disabledExposePaths?: string[]
}

type LegacyBackgroundExposeToggleState = {
  disabledTools?: unknown
  disabledResources?: unknown
  disabledSkills?: unknown
}

export const BACKGROUND_BROWSER_EXPOSE_DEFINITIONS: BackgroundExposeDefinition[] =
  [
    {
      path: '/extension/status',
      kind: 'endpoint',
      group: 'browser',
      method: 'GET',
      description:
        'Read the extension workspace status, multi-client connection state, and active tab summary.',
      legacyId: 'extension.getStatus'
    },
    {
      path: '/extension/config',
      kind: 'endpoint',
      group: 'browser',
      method: 'GET',
      description: 'Read the current Chrome extension workspace configuration.',
      legacyId: 'extension.getConfig'
    },
    {
      path: '/extension/granted-origins',
      kind: 'endpoint',
      group: 'browser',
      method: 'GET',
      description:
        'List the currently granted extension permissions and host origins.',
      legacyId: 'extension.listGrantedOrigins'
    },
    {
      path: '/extension/tabs',
      kind: 'endpoint',
      group: 'browser',
      method: 'GET',
      description: 'List browser tabs that the extension can see.',
      legacyId: 'extension.listTabs'
    },
    {
      path: '/extension/activate-tab',
      kind: 'endpoint',
      group: 'browser',
      method: 'POST',
      description: 'Activate a browser tab by id.',
      legacyId: 'extension.activateTab'
    },
    {
      path: '/extension/reload-tab',
      kind: 'endpoint',
      group: 'browser',
      method: 'POST',
      description: 'Reload a tab. Defaults to the current active tab.',
      legacyId: 'extension.reloadTab'
    },
    {
      path: '/extension/create-tab',
      kind: 'endpoint',
      group: 'browser',
      method: 'POST',
      description: 'Create a new browser tab.',
      legacyId: 'extension.createTab'
    },
    {
      path: '/extension/close-tab',
      kind: 'endpoint',
      group: 'browser',
      method: 'POST',
      description: 'Close a browser tab. Defaults to the current active tab.',
      legacyId: 'extension.closeTab'
    },
    {
      path: '/extension/show-notification',
      kind: 'endpoint',
      group: 'browser',
      method: 'POST',
      description: 'Show a native Chrome notification from the extension.',
      legacyId: 'extension.showNotification'
    },
    {
      path: '/extension/open-options-page',
      kind: 'endpoint',
      group: 'browser',
      method: 'POST',
      description: 'Open the extension options page.',
      legacyId: 'extension.openOptionsPage'
    },
    {
      path: '/extension/resources/status',
      kind: 'endpoint',
      group: 'browser',
      method: 'GET',
      contentType: 'application/json',
      description: 'Read a JSON snapshot of the extension status.',
      legacyId: 'chrome-extension://status'
    },
    {
      path: '/extension/resources/config',
      kind: 'endpoint',
      group: 'browser',
      method: 'GET',
      contentType: 'application/json',
      description: 'Read a JSON snapshot of the current extension workspace config.',
      legacyId: 'chrome-extension://config'
    },
    {
      path: '/extension/resources/tabs',
      kind: 'endpoint',
      group: 'browser',
      method: 'GET',
      contentType: 'application/json',
      description: 'Read a JSON snapshot of visible browser tabs.',
      legacyId: 'chrome-extension://tabs'
    }
  ]

export const BACKGROUND_WORKSPACE_EXPOSE_DEFINITIONS: BackgroundExposeDefinition[] =
  [
    {
      path: '/extension/clients',
      kind: 'endpoint',
      group: 'workspace',
      method: 'GET',
      description:
        'List stored background and route clients in the Chrome extension workspace.',
      legacyId: 'extension.listClients'
    },
    {
      path: '/extension/clients/create',
      kind: 'endpoint',
      group: 'workspace',
      method: 'POST',
      description:
        'Create a stored background or route client in the Chrome extension workspace.',
      legacyId: 'extension.createClient'
    },
    {
      path: '/extension/clients/update',
      kind: 'endpoint',
      group: 'workspace',
      method: 'POST',
      description:
        'Update a stored background or route client by internal id or clientId.',
      legacyId: 'extension.updateClient'
    },
    {
      path: '/extension/clients/delete',
      kind: 'endpoint',
      group: 'workspace',
      method: 'POST',
      description:
        'Delete a stored background or route client by internal id or clientId.',
      legacyId: 'extension.deleteClient'
    },
    {
      path: '/extension/clients/add-expose-rule',
      kind: 'endpoint',
      group: 'workspace',
      method: 'POST',
      description: 'Persist a new route expose rule for a stored route client.',
      legacyId: 'extension.addClientExposeRule'
    }
  ]

export const BACKGROUND_SKILL_EXPOSE_DEFINITIONS: BackgroundExposeDefinition[] =
  [
    {
      path: '/extension/skills/manage-clients/skill.md',
      kind: 'skill',
      group: 'skill',
      contentType: 'text/markdown',
      description:
        'Guide for creating, updating, and deleting stored Chrome extension clients.',
      legacyId: 'extension.manageClients'
    },
    {
      path: '/extension/skills/manage-client-expose-rules/skill.md',
      kind: 'skill',
      group: 'skill',
      contentType: 'text/markdown',
      description:
        'Guide for persisting route expose rules for a stored Chrome extension client.',
      legacyId: 'extension.manageClientExposeRules'
    }
  ]

export const BACKGROUND_EXPOSE_DEFINITIONS: BackgroundExposeDefinition[] = [
  ...BACKGROUND_BROWSER_EXPOSE_DEFINITIONS,
  ...BACKGROUND_WORKSPACE_EXPOSE_DEFINITIONS,
  ...BACKGROUND_SKILL_EXPOSE_DEFINITIONS
]

export const BACKGROUND_BROWSER_EXPOSE_PATHS =
  BACKGROUND_BROWSER_EXPOSE_DEFINITIONS.map((definition) => definition.path)

export const BACKGROUND_WORKSPACE_EXPOSE_PATHS =
  BACKGROUND_WORKSPACE_EXPOSE_DEFINITIONS.map((definition) => definition.path)

export const BACKGROUND_SKILL_EXPOSE_PATHS =
  BACKGROUND_SKILL_EXPOSE_DEFINITIONS.map((definition) => definition.path)

const BACKGROUND_EXPOSE_PATH_SET = new Set(
  BACKGROUND_EXPOSE_DEFINITIONS.map((definition) => definition.path)
)

const BACKGROUND_LEGACY_EXPOSE_ID_TO_PATH = new Map(
  BACKGROUND_EXPOSE_DEFINITIONS.flatMap((definition) =>
    definition.legacyId ? [[definition.legacyId, definition.path] as const] : []
  )
)

export function listBackgroundExposeDefinitions(filter?: {
  kind?: BackgroundExposeKind
  group?: BackgroundExposeGroup
}): BackgroundExposeDefinition[] {
  return BACKGROUND_EXPOSE_DEFINITIONS.filter((definition) => {
    if (filter?.kind && definition.kind !== filter.kind) {
      return false
    }

    if (filter?.group && definition.group !== filter.group) {
      return false
    }

    return true
  })
}

export function normalizeDisabledBackgroundExposePaths(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const requested = new Set<string>()

  for (const item of value) {
    if (typeof item !== 'string') {
      continue
    }

    const path = item.trim()

    if (path && BACKGROUND_EXPOSE_PATH_SET.has(path)) {
      requested.add(path)
    }
  }

  return BACKGROUND_EXPOSE_DEFINITIONS
    .filter((definition) => requested.has(definition.path))
    .map((definition) => definition.path)
}

export function normalizeLegacyDisabledBackgroundExposePaths(
  value: LegacyBackgroundExposeToggleState
): string[] {
  const requested = new Set<string>()

  for (const legacyValue of [
    value.disabledTools,
    value.disabledResources,
    value.disabledSkills
  ]) {
    if (!Array.isArray(legacyValue)) {
      continue
    }

    for (const item of legacyValue) {
      if (typeof item !== 'string') {
        continue
      }

      const path = BACKGROUND_LEGACY_EXPOSE_ID_TO_PATH.get(item.trim())

      if (path) {
        requested.add(path)
      }
    }
  }

  return BACKGROUND_EXPOSE_DEFINITIONS
    .filter((definition) => requested.has(definition.path))
    .map((definition) => definition.path)
}

export function isBackgroundExposeEnabled(
  config: BackgroundExposeToggleState,
  path: string
): boolean {
  return !config.disabledExposePaths?.includes(path)
}

export function countEnabledBackgroundExposes(
  config: BackgroundExposeToggleState,
  filter?: {
    kind?: BackgroundExposeKind
    group?: BackgroundExposeGroup
  }
): number {
  return listBackgroundExposeDefinitions(filter).filter((definition) =>
    isBackgroundExposeEnabled(config, definition.path)
  ).length
}
