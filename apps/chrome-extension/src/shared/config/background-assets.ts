import { asRecord, readBoolean, readString } from '../utils.js'

export type BackgroundExposeId =
  | 'extension.status'
  | 'extension.config'
  | 'extension.granted-origins'
  | 'extension.tabs'
  | 'extension.activate-tab'
  | 'extension.reload-tab'
  | 'extension.create-tab'
  | 'extension.close-tab'
  | 'extension.show-notification'
  | 'extension.open-options-page'
  | 'extension.resources.status'
  | 'extension.resources.config'
  | 'extension.resources.tabs'
  | 'extension.clients.list'
  | 'extension.clients.create'
  | 'extension.clients.update'
  | 'extension.clients.delete'
  | 'extension.clients.add-expose-rule'
  | 'extension.skills.manage-clients'
  | 'extension.skills.manage-client-expose-rules'

export type BackgroundExposeKind = 'endpoint' | 'skill'
export type BackgroundExposeGroup = 'browser' | 'workspace' | 'skill'
export type BackgroundExposeSourceKind = 'javascript' | 'markdown'

export interface BackgroundExposeDefinition {
  id: BackgroundExposeId
  path: string
  kind: BackgroundExposeKind
  group: BackgroundExposeGroup
  description: string
  sourceKind: BackgroundExposeSourceKind
  defaultSource: string
  method?: 'GET' | 'POST'
  contentType?: string
  legacyId?: string
}

export interface BackgroundExposeAsset {
  id: BackgroundExposeId
  path: string
  description: string
  enabled: boolean
  source: string
}

export interface BackgroundExposeToggleState {
  disabledExposePaths?: string[]
  exposes?: BackgroundExposeAsset[]
}

type LegacyBackgroundExposeToggleState = {
  disabledTools?: unknown
  disabledResources?: unknown
  disabledSkills?: unknown
}

export const BACKGROUND_BROWSER_EXPOSE_DEFINITIONS: BackgroundExposeDefinition[] =
  [
    {
      id: 'extension.status',
      path: '/extension/status',
      kind: 'endpoint',
      group: 'browser',
      method: 'GET',
      description:
        'Read the extension workspace status, multi-client connection state, and active tab summary.',
      sourceKind: 'javascript',
      defaultSource: `return await api.getStatus();`,
      legacyId: 'extension.getStatus'
    },
    {
      id: 'extension.config',
      path: '/extension/config',
      kind: 'endpoint',
      group: 'browser',
      method: 'GET',
      description: 'Read the current Chrome extension workspace configuration.',
      sourceKind: 'javascript',
      defaultSource: `return await api.getConfig();`,
      legacyId: 'extension.getConfig'
    },
    {
      id: 'extension.granted-origins',
      path: '/extension/granted-origins',
      kind: 'endpoint',
      group: 'browser',
      method: 'GET',
      description:
        'List the currently granted extension permissions and host origins.',
      sourceKind: 'javascript',
      defaultSource: `return await api.listGrantedOrigins();`,
      legacyId: 'extension.listGrantedOrigins'
    },
    {
      id: 'extension.tabs',
      path: '/extension/tabs',
      kind: 'endpoint',
      group: 'browser',
      method: 'GET',
      description: 'List browser tabs that the extension can see.',
      sourceKind: 'javascript',
      defaultSource: `return await api.listTabs(args && typeof args === 'object' ? args : {});`,
      legacyId: 'extension.listTabs'
    },
    {
      id: 'extension.activate-tab',
      path: '/extension/activate-tab',
      kind: 'endpoint',
      group: 'browser',
      method: 'POST',
      description: 'Activate a browser tab by id.',
      sourceKind: 'javascript',
      defaultSource: `return await api.activateTab(helpers.requireNumberArg(args, 'tabId'));`,
      legacyId: 'extension.activateTab'
    },
    {
      id: 'extension.reload-tab',
      path: '/extension/reload-tab',
      kind: 'endpoint',
      group: 'browser',
      method: 'POST',
      description: 'Reload a tab. Defaults to the current active tab.',
      sourceKind: 'javascript',
      defaultSource: `return await api.reloadTab(args);`,
      legacyId: 'extension.reloadTab'
    },
    {
      id: 'extension.create-tab',
      path: '/extension/create-tab',
      kind: 'endpoint',
      group: 'browser',
      method: 'POST',
      description: 'Create a new browser tab.',
      sourceKind: 'javascript',
      defaultSource: `const record = helpers.asRecord(args);
const active = helpers.readBoolean(record, 'active');

return await api.createTab({
  url: helpers.requireStringArg(record, 'url'),
  ...(active !== undefined ? { active } : {})
});`,
      legacyId: 'extension.createTab'
    },
    {
      id: 'extension.close-tab',
      path: '/extension/close-tab',
      kind: 'endpoint',
      group: 'browser',
      method: 'POST',
      description: 'Close a browser tab. Defaults to the current active tab.',
      sourceKind: 'javascript',
      defaultSource: `return await api.closeTab(args);`,
      legacyId: 'extension.closeTab'
    },
    {
      id: 'extension.show-notification',
      path: '/extension/show-notification',
      kind: 'endpoint',
      group: 'browser',
      method: 'POST',
      description: 'Show a native Chrome notification from the extension.',
      sourceKind: 'javascript',
      defaultSource: `const record = helpers.asRecord(args);
const message = helpers.readString(record, 'message');
const title = helpers.readString(record, 'title');

if (!message) {
  throw new Error('message is required');
}

return await api.showNotification({
  message,
  ...(title ? { title } : {})
});`,
      legacyId: 'extension.showNotification'
    },
    {
      id: 'extension.open-options-page',
      path: '/extension/open-options-page',
      kind: 'endpoint',
      group: 'browser',
      method: 'POST',
      description: 'Open the extension options page.',
      sourceKind: 'javascript',
      defaultSource: `return await api.openOptionsPage();`,
      legacyId: 'extension.openOptionsPage'
    },
    {
      id: 'extension.resources.status',
      path: '/extension/resources/status',
      kind: 'endpoint',
      group: 'browser',
      method: 'GET',
      contentType: 'application/json',
      description: 'Read a JSON snapshot of the extension status.',
      sourceKind: 'javascript',
      defaultSource: `return helpers.jsonResource(await api.getStatus());`,
      legacyId: 'chrome-extension://status'
    },
    {
      id: 'extension.resources.config',
      path: '/extension/resources/config',
      kind: 'endpoint',
      group: 'browser',
      method: 'GET',
      contentType: 'application/json',
      description: 'Read a JSON snapshot of the current extension workspace config.',
      sourceKind: 'javascript',
      defaultSource: `return helpers.jsonResource(await api.getConfig());`,
      legacyId: 'chrome-extension://config'
    },
    {
      id: 'extension.resources.tabs',
      path: '/extension/resources/tabs',
      kind: 'endpoint',
      group: 'browser',
      method: 'GET',
      contentType: 'application/json',
      description: 'Read a JSON snapshot of visible browser tabs.',
      sourceKind: 'javascript',
      defaultSource: `return helpers.jsonResource({
  tabs: await api.listTabs({})
});`,
      legacyId: 'chrome-extension://tabs'
    }
  ]

export const BACKGROUND_WORKSPACE_EXPOSE_DEFINITIONS: BackgroundExposeDefinition[] =
  [
    {
      id: 'extension.clients.list',
      path: '/extension/clients',
      kind: 'endpoint',
      group: 'workspace',
      method: 'GET',
      description:
        'List stored background and route clients in the Chrome extension workspace.',
      sourceKind: 'javascript',
      defaultSource: `return await api.listWorkspaceClients();`,
      legacyId: 'extension.listClients'
    },
    {
      id: 'extension.clients.create',
      path: '/extension/clients/create',
      kind: 'endpoint',
      group: 'workspace',
      method: 'POST',
      description:
        'Create a stored background or route client in the Chrome extension workspace.',
      sourceKind: 'javascript',
      defaultSource: `return await api.createWorkspaceClient(args);`,
      legacyId: 'extension.createClient'
    },
    {
      id: 'extension.clients.update',
      path: '/extension/clients/update',
      kind: 'endpoint',
      group: 'workspace',
      method: 'POST',
      description:
        'Update a stored background or route client by internal id or clientId.',
      sourceKind: 'javascript',
      defaultSource: `return await api.updateWorkspaceClient(args);`,
      legacyId: 'extension.updateClient'
    },
    {
      id: 'extension.clients.delete',
      path: '/extension/clients/delete',
      kind: 'endpoint',
      group: 'workspace',
      method: 'POST',
      description:
        'Delete a stored background or route client by internal id or clientId.',
      sourceKind: 'javascript',
      defaultSource: `return await api.deleteWorkspaceClient(args);`,
      legacyId: 'extension.deleteClient'
    },
    {
      id: 'extension.clients.add-expose-rule',
      path: '/extension/clients/add-expose-rule',
      kind: 'endpoint',
      group: 'workspace',
      method: 'POST',
      description: 'Persist a new route expose rule for a stored route client.',
      sourceKind: 'javascript',
      defaultSource: `return await api.addExposeRuleToClient(args);`,
      legacyId: 'extension.addClientExposeRule'
    }
  ]

export const BACKGROUND_SKILL_EXPOSE_DEFINITIONS: BackgroundExposeDefinition[] =
  [
    {
      id: 'extension.skills.manage-clients',
      path: '/extension/skills/manage-clients/skill.md',
      kind: 'skill',
      group: 'skill',
      contentType: 'text/markdown',
      description:
        'Guide for creating, updating, and deleting stored Chrome extension clients.',
      sourceKind: 'markdown',
      defaultSource: `# Manage Chrome Workspace Clients

Use this skill to inspect, create, update, or delete the Chrome extension clients stored in the workspace.

## Recommended workflow

1. Read \`/extension/clients\` and inspect the current \`backgroundClients\` and \`routeClients\` entries.
2. Create a new \`background\` or \`route\` client with \`/extension/clients/create\`.
3. Update client metadata, enablement, icons, expose paths, descriptions, or backend scripts with \`/extension/clients/update\`.
4. Delete a client when it is no longer needed with \`/extension/clients/delete\`.

## Targeting rules

- Prefer the internal \`id\` field from the client listing result when mutating a specific client.
- Pass \`kind\` together with \`clientId\` if the target would otherwise be ambiguous.
- The built-in \`background-client-workspace\` client is required and cannot be deleted.

## Notes

- Mutations are persisted to extension storage.
- Saved changes are applied to connected clients right after the write completes.
`,
      legacyId: 'extension.manageClients'
    },
    {
      id: 'extension.skills.manage-client-expose-rules',
      path: '/extension/skills/manage-client-expose-rules/skill.md',
      kind: 'skill',
      group: 'skill',
      contentType: 'text/markdown',
      description:
        'Guide for persisting route expose rules for a stored Chrome extension client.',
      sourceKind: 'markdown',
      defaultSource: `# Add Stored Expose Rules To Route Clients

Use this skill when you need to add and persist a new expose rule for a route client.

## Recommended workflow

1. Read \`/extension/clients\` and find the target route client.
2. Call \`/extension/clients/add-expose-rule\` with the route client \`id\`, a \`mode\`, and a \`value\`.
3. Re-read the client listing if you need to confirm the saved route rule list.

## Supported modes

- \`pathname-prefix\`
- \`pathname-exact\`
- \`url-contains\`
- \`regex\`

## Notes

- This endpoint only works for \`route\` clients.
- The response sets \`duplicate: true\` when the same \`mode\` and \`value\` already exist.
- Stored expose rules are persisted and then applied to the live route client registration.
`,
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

const BACKGROUND_EXPOSE_DEFINITION_BY_ID = new Map(
  BACKGROUND_EXPOSE_DEFINITIONS.map((definition) => [definition.id, definition] as const)
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

export function getBackgroundExposeDefinition(
  id: BackgroundExposeId
): BackgroundExposeDefinition | undefined {
  return BACKGROUND_EXPOSE_DEFINITION_BY_ID.get(id)
}

export function cloneBackgroundExposeAssets(
  assets: readonly BackgroundExposeAsset[]
): BackgroundExposeAsset[] {
  return assets.map((asset) => ({ ...asset }))
}

export function createBackgroundExposeAssets(
  disabledExposePaths: readonly string[] = []
): BackgroundExposeAsset[] {
  const disabled = new Set(disabledExposePaths)

  return BACKGROUND_EXPOSE_DEFINITIONS.map((definition) => ({
    id: definition.id,
    path: definition.path,
    description: definition.description,
    enabled: !disabled.has(definition.path),
    source: definition.defaultSource
  }))
}

export function deriveDisabledBackgroundExposePaths(
  assets: readonly BackgroundExposeAsset[]
): string[] {
  return assets.filter((asset) => !asset.enabled).map((asset) => asset.path)
}

export function normalizeBackgroundExposeAssets(
  value: unknown,
  fallbackDisabledExposePaths: readonly string[] = []
): BackgroundExposeAsset[] {
  const fallbackById = new Map(
    createBackgroundExposeAssets(fallbackDisabledExposePaths).map((asset) => [
      asset.id,
      asset
    ] as const)
  )

  if (!Array.isArray(value)) {
    return cloneBackgroundExposeAssets([...fallbackById.values()])
  }

  const requested = new Map<BackgroundExposeId, BackgroundExposeAsset>()

  for (const item of value) {
    const record = asRecord(item)
    const id = readString(record, 'id') as BackgroundExposeId | undefined
    const definition = id ? getBackgroundExposeDefinition(id) : undefined

    if (!definition) {
      continue
    }

    const fallback = fallbackById.get(definition.id)

    requested.set(definition.id, {
      id: definition.id,
      path: normalizeBackgroundExposePath(
        readString(record, 'path'),
        fallback?.path ?? definition.path
      ),
      description: normalizeBackgroundExposeDescription(
        readString(record, 'description'),
        fallback?.description ?? definition.description
      ),
      enabled: readBoolean(record, 'enabled') ?? fallback?.enabled ?? true,
      source: normalizeBackgroundExposeSource(
        readString(record, 'source'),
        fallback?.source ?? definition.defaultSource
      )
    })
  }

  return BACKGROUND_EXPOSE_DEFINITIONS.map(
    (definition) =>
      requested.get(definition.id) ??
      fallbackById.get(definition.id) ?? {
        id: definition.id,
        path: definition.path,
        description: definition.description,
        enabled: true,
        source: definition.defaultSource
      }
  )
}

export function getConfiguredBackgroundExpose(
  config: BackgroundExposeToggleState,
  id: BackgroundExposeId
): BackgroundExposeAsset | undefined {
  if (config.exposes) {
    return config.exposes.find((asset) => asset.id === id)
  }

  const definition = getBackgroundExposeDefinition(id)

  if (!definition) {
    return undefined
  }

  return {
    id: definition.id,
    path: definition.path,
    description: definition.description,
    enabled: !config.disabledExposePaths?.includes(definition.path),
    source: definition.defaultSource
  }
}

export function listConfiguredBackgroundExposes(
  config: BackgroundExposeToggleState,
  filter?: {
    kind?: BackgroundExposeKind
    group?: BackgroundExposeGroup
  }
): BackgroundExposeAsset[] {
  return listBackgroundExposeDefinitions(filter)
    .map((definition) => getConfiguredBackgroundExpose(config, definition.id))
    .filter((definition): definition is BackgroundExposeAsset => Boolean(definition))
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
  if (config.exposes) {
    return config.exposes.some((asset) => asset.path === path && asset.enabled)
  }

  return !config.disabledExposePaths?.includes(path)
}

export function countEnabledBackgroundExposes(
  config: BackgroundExposeToggleState,
  filter?: {
    kind?: BackgroundExposeKind
    group?: BackgroundExposeGroup
  }
): number {
  return listConfiguredBackgroundExposes(config, filter).filter(
    (definition) => definition.enabled
  ).length
}

function normalizeBackgroundExposePath(
  value: string | undefined,
  fallback: string
): string {
  const normalized = value?.trim()

  if (!normalized) {
    return fallback
  }

  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

function normalizeBackgroundExposeDescription(
  value: string | undefined,
  fallback: string
): string {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : fallback
}

function normalizeBackgroundExposeSource(
  value: string | undefined,
  fallback: string
): string {
  return value !== undefined ? value : fallback
}
