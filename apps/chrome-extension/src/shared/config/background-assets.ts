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
  | 'extension.skills.root'
  | 'extension.skills.resources'
  | 'extension.skills.manage-clients'
  | 'extension.skills.manage-client-expose-rules'

export type BackgroundExposeKind = 'endpoint' | 'skill'
export type BackgroundExposeGroup = 'browser' | 'workspace' | 'skill'
export type BackgroundExposeSourceKind = 'javascript' | 'markdown'

export interface BackgroundExposeDefinition {
  id: BackgroundExposeId
  path: string
  legacyPaths?: readonly string[]
  legacyDescriptions?: readonly string[]
  legacySources?: readonly string[]
  kind: BackgroundExposeKind
  group: BackgroundExposeGroup
  description: string
  sourceKind: BackgroundExposeSourceKind
  defaultSource: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
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

function withLegacyExtensionPrefix(
  definitions: readonly BackgroundExposeDefinition[]
): BackgroundExposeDefinition[] {
  return definitions.map((definition) => {
    const legacyPaths = new Set(definition.legacyPaths ?? [])
    legacyPaths.add(`/extension${definition.path === '/SKILL.md' ? '/SKILL.md' : definition.path}`)

    return {
      ...definition,
      legacyPaths: [...legacyPaths]
    }
  })
}

const LEGACY_ROOT_SKILL_DESCRIPTION =
  'Overview for the /extension directory and the built-in Chrome extension capabilities exposed from it.'
const LEGACY_ROOT_SKILL_SOURCE = `# /extension

This directory is the root of the built-in Chrome extension capabilities exposed through Model Drive Protocol.

## How to navigate

- Read the files directly under \`/extension\` for runtime status and browser actions.
- Read \`/extension/resources/SKILL.md\` before working with JSON snapshot resources.
- Read \`/extension/clients/SKILL.md\` before creating, updating, or deleting stored clients.

## Notes

- Different background clients can expose different subsets of this directory.
- Prefer reading the nearest \`SKILL.md\` in the folder you are working in.
- If a folder contains \`.ai/skills\` or \`.ai/rules\`, use those for more detailed guidance.
`

const LEGACY_RESOURCES_SKILL_DESCRIPTION =
  'Overview for the /extension/resources directory and its JSON snapshot resources.'
const LEGACY_RESOURCES_SKILL_SOURCE = `# /extension/resources

This directory contains read-only JSON snapshot resources for the built-in Chrome extension runtime.

## What lives here

- \`/extension/resources/status\`: extension status snapshot
- \`/extension/resources/config\`: workspace configuration snapshot
- \`/extension/resources/tabs\`: visible browser tabs snapshot

## How to work in this folder

1. Prefer these resources when you need structured snapshots instead of imperative actions.
2. Read \`/extension/SKILL.md\` if you need a broader overview of the extension capability tree.

## Notes

- These paths are read-only snapshots.
- The payloads are returned as JSON resources.
`

const LEGACY_MANAGE_CLIENTS_SKILL_DESCRIPTION =
  'Overview for the /extension/clients workspace folder and its built-in management capabilities.'
const LEGACY_MANAGE_CLIENTS_SKILL_SOURCE = `# /extension/clients

This folder contains the built-in workspace management capabilities for stored Chrome extension clients.

## What lives here

- \`/extension/clients\`: list stored background and route clients
- \`POST /extension/clients/create\`: create a new stored client
- \`PATCH /extension/clients/update\`: update a stored client
- \`DELETE /extension/clients/delete\`: delete a stored client
- \`POST /extension/clients/add-expose-rule\`: persist a new route expose rule

## How to work in this folder

1. Read \`/extension/clients\` first so you know the current \`backgroundClients\` and \`routeClients\`.
2. Use the create, update, and delete paths to mutate stored clients.
3. Prefer the internal \`id\` when mutating a specific client.
4. Read \`/extension/clients/.ai/skills/manage-client-expose-rules/SKILL.md\` if the task is specifically about route expose rules.

## Notes

- Changes are persisted to extension storage.
- Saved changes are applied to connected clients immediately.
- The built-in \`background-client-workspace\` client is required and cannot be deleted.
`

const LEGACY_MANAGE_CLIENTS_GUIDE_DESCRIPTION =
  'Guide for creating, updating, and deleting stored Chrome extension clients.'
const LEGACY_MANAGE_CLIENTS_GUIDE_SOURCE = `# Manage Chrome Workspace Clients

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
`

const LEGACY_MANAGE_CLIENT_EXPOSE_RULES_SKILL_DESCRIPTION =
  'Detailed skill for persisting route expose rules under the /extension/clients workspace folder.'
const LEGACY_MANAGE_CLIENT_EXPOSE_RULES_SKILL_SOURCE = `# /extension/clients/.ai/skills/manage-client-expose-rules

Use this skill when the task is specifically about persisting new expose rules for a stored route client.

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
`

const LEGACY_MANAGE_CLIENT_EXPOSE_RULES_GUIDE_DESCRIPTION =
  'Guide for persisting route expose rules for a stored Chrome extension client.'
const LEGACY_MANAGE_CLIENT_EXPOSE_RULES_GUIDE_SOURCE = `# Add Stored Expose Rules To Route Clients

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
`

export const BACKGROUND_BROWSER_EXPOSE_DEFINITIONS: BackgroundExposeDefinition[] =
  withLegacyExtensionPrefix([
    {
      id: 'extension.status',
      path: '/status',
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
      path: '/config',
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
      path: '/granted-origins',
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
      path: '/tabs',
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
      path: '/activate-tab',
      kind: 'endpoint',
      group: 'browser',
      method: 'PATCH',
      description: 'Activate a browser tab by id.',
      sourceKind: 'javascript',
      defaultSource: `return await api.activateTab(helpers.requireNumberArg(args, 'tabId'));`,
      legacyId: 'extension.activateTab'
    },
    {
      id: 'extension.reload-tab',
      path: '/reload-tab',
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
      path: '/create-tab',
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
      path: '/close-tab',
      kind: 'endpoint',
      group: 'browser',
      method: 'DELETE',
      description: 'Close a browser tab. Defaults to the current active tab.',
      sourceKind: 'javascript',
      defaultSource: `return await api.closeTab(args);`,
      legacyId: 'extension.closeTab'
    },
    {
      id: 'extension.show-notification',
      path: '/show-notification',
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
      path: '/open-options-page',
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
      path: '/resources/status',
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
      path: '/resources/config',
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
      path: '/resources/tabs',
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
  ])

export const BACKGROUND_WORKSPACE_EXPOSE_DEFINITIONS: BackgroundExposeDefinition[] =
  withLegacyExtensionPrefix([
    {
      id: 'extension.clients.list',
      path: '/clients',
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
      path: '/clients/create',
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
      path: '/clients/update',
      kind: 'endpoint',
      group: 'workspace',
      method: 'PATCH',
      description:
        'Update a stored background or route client by internal id or clientId.',
      sourceKind: 'javascript',
      defaultSource: `return await api.updateWorkspaceClient(args);`,
      legacyId: 'extension.updateClient'
    },
    {
      id: 'extension.clients.delete',
      path: '/clients/delete',
      kind: 'endpoint',
      group: 'workspace',
      method: 'DELETE',
      description:
        'Delete a stored background or route client by internal id or clientId.',
      sourceKind: 'javascript',
      defaultSource: `return await api.deleteWorkspaceClient(args);`,
      legacyId: 'extension.deleteClient'
    },
    {
      id: 'extension.clients.add-expose-rule',
      path: '/clients/add-expose-rule',
      kind: 'endpoint',
      group: 'workspace',
      method: 'POST',
      description: 'Persist a new route expose rule for a stored route client.',
      sourceKind: 'javascript',
      defaultSource: `return await api.addExposeRuleToClient(args);`,
      legacyId: 'extension.addClientExposeRule'
    }
  ])

export const BACKGROUND_SKILL_EXPOSE_DEFINITIONS: BackgroundExposeDefinition[] =
  withLegacyExtensionPrefix([
    {
      id: 'extension.skills.root',
      path: '/SKILL.md',
      legacyDescriptions: [LEGACY_ROOT_SKILL_DESCRIPTION],
      legacySources: [LEGACY_ROOT_SKILL_SOURCE],
      kind: 'skill',
      group: 'skill',
      contentType: 'text/markdown',
      description:
        'Overview for the root directory and the built-in Chrome extension capabilities exposed from it.',
      sourceKind: 'markdown',
      defaultSource: `# /

This directory is the root of the built-in Chrome extension capabilities exposed through Model Drive Protocol.

## How to navigate

- Read the files directly under \`/\` for runtime status and browser actions.
- Read \`/resources/SKILL.md\` before working with JSON snapshot resources.
- Read \`/clients/SKILL.md\` before creating, updating, or deleting stored clients.

## Notes

- Different background clients can expose different subsets of this directory.
- Prefer reading the nearest \`SKILL.md\` in the folder you are working in.
- If a folder contains \`.ai/skills\` or \`.ai/rules\`, use those for more detailed guidance.
`
    },
    {
      id: 'extension.skills.resources',
      path: '/resources/SKILL.md',
      legacyDescriptions: [LEGACY_RESOURCES_SKILL_DESCRIPTION],
      legacySources: [LEGACY_RESOURCES_SKILL_SOURCE],
      kind: 'skill',
      group: 'skill',
      contentType: 'text/markdown',
      description:
        'Overview for the /resources directory and its JSON snapshot resources.',
      sourceKind: 'markdown',
      defaultSource: `# /resources

This directory contains read-only JSON snapshot resources for the built-in Chrome extension runtime.

## What lives here

- \`/resources/status\`: extension status snapshot
- \`/resources/config\`: workspace configuration snapshot
- \`/resources/tabs\`: visible browser tabs snapshot

## How to work in this folder

1. Prefer these resources when you need structured snapshots instead of imperative actions.
2. Read \`/SKILL.md\` if you need a broader overview of the extension capability tree.

## Notes

- These paths are read-only snapshots.
- The payloads are returned as JSON resources.
`
    },
    {
      id: 'extension.skills.manage-clients',
      path: '/clients/SKILL.md',
      legacyPaths: [
        '/extension/skills/manage-clients/skill.md',
        '/extension/clients/skill.md',
        '/clients/skill.md'
      ],
      legacyDescriptions: [
        LEGACY_MANAGE_CLIENTS_SKILL_DESCRIPTION,
        LEGACY_MANAGE_CLIENTS_GUIDE_DESCRIPTION
      ],
      legacySources: [
        LEGACY_MANAGE_CLIENTS_SKILL_SOURCE,
        LEGACY_MANAGE_CLIENTS_GUIDE_SOURCE
      ],
      kind: 'skill',
      group: 'skill',
      contentType: 'text/markdown',
      description:
        'Overview for the /clients workspace folder and its built-in management capabilities.',
      sourceKind: 'markdown',
      defaultSource: `# /clients

This folder contains the built-in workspace management capabilities for stored Chrome extension clients.

## What lives here

- \`/clients\`: list stored background and route clients
- \`POST /clients/create\`: create a new stored client
- \`PATCH /clients/update\`: update a stored client
- \`DELETE /clients/delete\`: delete a stored client
- \`POST /clients/add-expose-rule\`: persist a new route expose rule

## How to work in this folder

1. Read \`/clients\` first so you know the current \`backgroundClients\` and \`routeClients\`.
2. Use the create, update, and delete paths to mutate stored clients.
3. Prefer the internal \`id\` when mutating a specific client.
4. Read \`/clients/.ai/skills/manage-client-expose-rules/SKILL.md\` if the task is specifically about route expose rules.

## Notes

- Changes are persisted to extension storage.
- Saved changes are applied to connected clients immediately.
- The built-in \`background-client-workspace\` client is required and cannot be deleted.
`,
      legacyId: 'extension.manageClients'
    },
    {
      id: 'extension.skills.manage-client-expose-rules',
      path: '/clients/.ai/skills/manage-client-expose-rules/SKILL.md',
      legacyPaths: [
        '/extension/skills/manage-client-expose-rules/skill.md',
        '/extension/clients/.ai/skills/manage-client-expose-rules/skill.md',
        '/clients/.ai/skills/manage-client-expose-rules/skill.md'
      ],
      legacyDescriptions: [
        LEGACY_MANAGE_CLIENT_EXPOSE_RULES_SKILL_DESCRIPTION,
        LEGACY_MANAGE_CLIENT_EXPOSE_RULES_GUIDE_DESCRIPTION
      ],
      legacySources: [
        LEGACY_MANAGE_CLIENT_EXPOSE_RULES_SKILL_SOURCE,
        LEGACY_MANAGE_CLIENT_EXPOSE_RULES_GUIDE_SOURCE
      ],
      kind: 'skill',
      group: 'skill',
      contentType: 'text/markdown',
      description:
        'Detailed skill for persisting route expose rules under the /clients workspace folder.',
      sourceKind: 'markdown',
      defaultSource: `# /clients/.ai/skills/manage-client-expose-rules

Use this skill when the task is specifically about persisting new expose rules for a stored route client.

## Recommended workflow

1. Read \`/clients\` and find the target route client.
2. Call \`/clients/add-expose-rule\` with the route client \`id\`, a \`mode\`, and a \`value\`.
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
  ])

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

export const BACKGROUND_BROWSER_SKILL_EXPOSE_PATHS =
  BACKGROUND_SKILL_EXPOSE_DEFINITIONS.filter((definition) =>
    definition.id === 'extension.skills.root' ||
    definition.id === 'extension.skills.resources'
  ).map((definition) => definition.path)

export const BACKGROUND_WORKSPACE_SKILL_EXPOSE_PATHS =
  BACKGROUND_SKILL_EXPOSE_DEFINITIONS.filter((definition) =>
    definition.id === 'extension.skills.root' ||
    definition.id === 'extension.skills.manage-clients' ||
    definition.id === 'extension.skills.manage-client-expose-rules'
  ).map((definition) => definition.path)

const BACKGROUND_EXPOSE_PATH_SET = new Set(
  BACKGROUND_EXPOSE_DEFINITIONS.map((definition) => definition.path)
)

const BACKGROUND_LEGACY_EXPOSE_ID_TO_PATH = new Map(
  BACKGROUND_EXPOSE_DEFINITIONS.flatMap((definition) =>
    definition.legacyId ? [[definition.legacyId, definition.path] as const] : []
  )
)

const BACKGROUND_LEGACY_EXPOSE_PATH_TO_PATH = new Map(
  BACKGROUND_EXPOSE_DEFINITIONS.flatMap((definition) =>
    (definition.legacyPaths ?? []).map((path) => [path, definition.path] as const)
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
        fallback?.path ?? definition.path,
        definition
      ),
      description: normalizeBackgroundExposeDescription(
        readString(record, 'description'),
        fallback?.description ?? definition.description,
        definition
      ),
      enabled: readBoolean(record, 'enabled') ?? fallback?.enabled ?? true,
      source: normalizeBackgroundExposeSource(
        readString(record, 'source'),
        fallback?.source ?? definition.defaultSource,
        definition
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

    const path =
      BACKGROUND_LEGACY_EXPOSE_PATH_TO_PATH.get(item.trim()) ?? item.trim()

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
  fallback: string,
  definition: BackgroundExposeDefinition
): string {
  const normalized = value?.trim()

  if (!normalized) {
    return fallback
  }

  const path = normalized.startsWith('/') ? normalized : `/${normalized}`

  if (definition.legacyPaths?.includes(path)) {
    return definition.path
  }

  return path
}

function normalizeBackgroundExposeDescription(
  value: string | undefined,
  fallback: string,
  definition: BackgroundExposeDefinition
): string {
  const normalized = value?.trim()
  if (!normalized || normalized.length === 0) {
    return fallback
  }

  if (definition.legacyDescriptions?.includes(normalized)) {
    return definition.description
  }

  return normalized
}

function normalizeBackgroundExposeSource(
  value: string | undefined,
  fallback: string,
  definition: BackgroundExposeDefinition
): string {
  if (value === undefined) {
    return fallback
  }

  if (definition.legacySources?.includes(value)) {
    return definition.defaultSource
  }

  return value
}
