import {
  createBackgroundClientConfig,
  createRouteClientConfig,
  createRouteRule,
  isRequiredBackgroundClientId,
  normalizeDisabledBackgroundExposePaths,
  normalizeLegacyDisabledBackgroundExposePaths,
  DEFAULT_WORKSPACE_MANAGEMENT_CLIENT,
  type BackgroundClientConfig,
  type ExtensionConfig,
  type RouteClientConfig
} from '#~/shared/config.js'
import { saveConfig } from '#~/shared/storage.js'

import type {
  WorkspaceClientCreateInput,
  WorkspaceClientDeleteResult,
  WorkspaceClientExposeRuleInput,
  WorkspaceClientExposeRuleResult,
  WorkspaceClientMutationResult,
  WorkspaceClientsSnapshot,
  WorkspaceClientTargetInput,
  WorkspaceClientUpdateInput
} from '../runtime-api.js'
import type { ChromeExtensionRuntime } from '../runtime.js'

type ResolvedBackgroundClient = {
  kind: 'background'
  client: BackgroundClientConfig
}

type ResolvedRouteClient = {
  kind: 'route'
  client: RouteClientConfig
}

type ResolvedClient = ResolvedBackgroundClient | ResolvedRouteClient

export async function listWorkspaceClients(
  runtime: ChromeExtensionRuntime
): Promise<WorkspaceClientsSnapshot> {
  const config = await runtime.getConfig()

  return {
    backgroundClients: config.backgroundClients.map((client) => ({
      ...client,
      disabledExposePaths: [...client.disabledExposePaths]
    })),
    routeClients: config.routeClients.map((client) => ({
      ...client,
      matchPatterns: [...client.matchPatterns],
      routeRules: client.routeRules.map((rule) => ({ ...rule })),
      recordings: client.recordings.map((recording) => ({
        ...recording,
        capturedFeatures: [...recording.capturedFeatures],
        steps: recording.steps.map((step) => ({
          ...step,
          alternativeSelectors: [...step.alternativeSelectors],
          classes: [...step.classes]
        }))
      })),
      selectorResources: client.selectorResources.map((resource) => ({
        ...resource,
        alternativeSelectors: [...resource.alternativeSelectors],
        classes: [...resource.classes],
        attributes: { ...resource.attributes }
      })),
      skillFolders: client.skillFolders.map((folder) => ({ ...folder })),
      skillEntries: client.skillEntries.map((skill) => ({
        ...skill,
        metadata: {
          ...skill.metadata,
          queryParameters: skill.metadata.queryParameters.map((parameter) => ({
            ...parameter
          })),
          headerParameters: skill.metadata.headerParameters.map((parameter) => ({
            ...parameter
          }))
        }
      })),
      ...(client.installSource ? { installSource: { ...client.installSource } } : {})
    }))
  }
}

export async function createWorkspaceClient(
  runtime: ChromeExtensionRuntime,
  input: WorkspaceClientCreateInput
): Promise<
  WorkspaceClientMutationResult<BackgroundClientConfig | RouteClientConfig>
> {
  const config = await runtime.getConfig()
  const nextId = input.id?.trim()
  const nextClientId = input.clientId?.trim()

  assertClientIdentityAvailable(config, {
    ...(nextId ? { id: nextId } : {}),
    ...(nextClientId ? { clientId: nextClientId } : {})
  })

  if (input.kind === 'background') {
    const disabledExposePaths = resolveBackgroundClientDisabledExposePaths(input)
    const client = createBackgroundClientConfig({
      ...(input.id?.trim() ? { id: input.id.trim() } : {}),
      ...(nextClientId ? { clientId: nextClientId } : {}),
      ...(input.clientName?.trim() ? { clientName: input.clientName.trim() } : {}),
      ...(input.clientDescription?.trim()
        ? { clientDescription: input.clientDescription.trim() }
        : {}),
      ...(input.icon ? { icon: input.icon } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.favorite !== undefined ? { favorite: input.favorite } : {}),
      ...(disabledExposePaths !== undefined ? { disabledExposePaths } : {})
    })
    const nextConfig = {
      ...config,
      backgroundClients: [...config.backgroundClients, client]
    }
    const savedConfig = await persistWorkspaceConfig(runtime, nextConfig)

    return {
      client: savedConfig.backgroundClients.find((item) => item.id === client.id) ?? client
    }
  }

  const client = createRouteClientConfig({
    ...(input.id?.trim() ? { id: input.id.trim() } : {}),
    ...(nextClientId ? { clientId: nextClientId } : {}),
    ...(input.clientName?.trim() ? { clientName: input.clientName.trim() } : {}),
    ...(input.clientDescription?.trim()
      ? { clientDescription: input.clientDescription.trim() }
      : {}),
    ...(input.icon ? { icon: input.icon } : {}),
    ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    ...(input.favorite !== undefined ? { favorite: input.favorite } : {}),
    ...(input.matchPatterns ? { matchPatterns: [...input.matchPatterns] } : {}),
    ...(input.autoInjectBridge !== undefined
      ? { autoInjectBridge: input.autoInjectBridge }
      : {}),
    ...(input.pathScriptSource !== undefined
      ? { pathScriptSource: input.pathScriptSource }
      : {})
  })
  const nextConfig = {
    ...config,
    routeClients: [...config.routeClients, client]
  }
  const savedConfig = await persistWorkspaceConfig(runtime, nextConfig)

  return {
    client: savedConfig.routeClients.find((item) => item.id === client.id) ?? client
  }
}

export async function updateWorkspaceClient(
  runtime: ChromeExtensionRuntime,
  input: WorkspaceClientUpdateInput
): Promise<
  WorkspaceClientMutationResult<BackgroundClientConfig | RouteClientConfig>
> {
  const config = await runtime.getConfig()
  const resolved = resolveClientTarget(config, input)
  const nextClientId = input.nextClientId?.trim()

  if (nextClientId && nextClientId !== resolved.client.clientId) {
    assertClientIdentityAvailable(config, {
      clientId: nextClientId,
      excludeId: resolved.client.id
    })
  }

  if (resolved.kind === 'background') {
    assertRequiredBackgroundClientUpdate(resolved.client, input)
    const disabledExposePaths = resolveBackgroundClientDisabledExposePaths(input)

    const nextClient: BackgroundClientConfig = {
      ...resolved.client,
      ...(input.clientName?.trim() ? { clientName: input.clientName.trim() } : {}),
      ...(input.clientDescription?.trim()
        ? { clientDescription: input.clientDescription.trim() }
        : {}),
      ...(input.icon ? { icon: input.icon } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.favorite !== undefined ? { favorite: input.favorite } : {}),
      ...(nextClientId ? { clientId: nextClientId } : {}),
      ...(disabledExposePaths !== undefined ? { disabledExposePaths } : {})
    }
    const nextConfig = {
      ...config,
      backgroundClients: config.backgroundClients.map((client) =>
        client.id === nextClient.id ? nextClient : client
      )
    }
    const savedConfig = await persistWorkspaceConfig(runtime, nextConfig)

    return {
      client:
        savedConfig.backgroundClients.find((client) => client.id === nextClient.id) ??
        nextClient
    }
  }

  const nextClient: RouteClientConfig = {
    ...resolved.client,
    ...(input.clientName?.trim() ? { clientName: input.clientName.trim() } : {}),
    ...(input.clientDescription?.trim()
      ? { clientDescription: input.clientDescription.trim() }
      : {}),
    ...(input.icon ? { icon: input.icon } : {}),
    ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    ...(input.favorite !== undefined ? { favorite: input.favorite } : {}),
    ...(nextClientId ? { clientId: nextClientId } : {}),
    ...(input.matchPatterns ? { matchPatterns: [...input.matchPatterns] } : {}),
    ...(input.autoInjectBridge !== undefined
      ? { autoInjectBridge: input.autoInjectBridge }
      : {}),
    ...(input.pathScriptSource !== undefined
      ? { pathScriptSource: input.pathScriptSource }
      : {})
  }
  const nextConfig = {
    ...config,
    routeClients: config.routeClients.map((client) =>
      client.id === nextClient.id ? nextClient : client
    )
  }
  const savedConfig = await persistWorkspaceConfig(runtime, nextConfig)

  return {
    client: savedConfig.routeClients.find((client) => client.id === nextClient.id) ?? nextClient
  }
}

export async function deleteWorkspaceClient(
  runtime: ChromeExtensionRuntime,
  input: WorkspaceClientTargetInput
): Promise<WorkspaceClientDeleteResult> {
  const config = await runtime.getConfig()
  const resolved = resolveClientTarget(config, input)

  if (resolved.kind === 'background' && isRequiredBackgroundClientId(resolved.client.id)) {
    throw new Error(`Background client "${resolved.client.clientName}" is required`)
  }

  const nextConfig =
    resolved.kind === 'background'
      ? {
          ...config,
          backgroundClients: config.backgroundClients.filter(
            (client) => client.id !== resolved.client.id
          )
        }
      : {
          ...config,
          routeClients: config.routeClients.filter(
            (client) => client.id !== resolved.client.id
          )
        }

  await persistWorkspaceConfig(runtime, nextConfig)

  return {
    client: {
      kind: resolved.kind,
      id: resolved.client.id,
      clientId: resolved.client.clientId,
      clientName: resolved.client.clientName
    }
  }
}

export async function addExposeRuleToClient(
  runtime: ChromeExtensionRuntime,
  input: WorkspaceClientExposeRuleInput
): Promise<WorkspaceClientExposeRuleResult> {
  const config = await runtime.getConfig()
  const resolved = resolveClientTarget(config, input)

  if (resolved.kind !== 'route') {
    throw new Error('Expose rules can only be added to route clients')
  }

  const value = input.value.trim()

  if (!value) {
    throw new Error('value is required')
  }

  const mode = input.mode ?? 'pathname-prefix'
  const existingRule = resolved.client.routeRules.find(
    (rule) => rule.mode === mode && rule.value === value
  )
  const routeRule = existingRule ?? createRouteRule(mode, value)
  const nextRouteRules = existingRule
    ? resolved.client.routeRules
    : input.prepend
      ? [routeRule, ...resolved.client.routeRules]
      : [...resolved.client.routeRules, routeRule]
  const nextClient: RouteClientConfig = {
    ...resolved.client,
    routeRules: nextRouteRules
  }
  const nextConfig = {
    ...config,
    routeClients: config.routeClients.map((client) =>
      client.id === nextClient.id ? nextClient : client
    )
  }
  const savedConfig = await persistWorkspaceConfig(runtime, nextConfig)
  const savedClient =
    savedConfig.routeClients.find((client) => client.id === nextClient.id) ?? nextClient

  return {
    client: savedClient,
    routeRule:
      savedClient.routeRules.find((rule) => rule.id === routeRule.id) ?? routeRule,
    duplicate: Boolean(existingRule)
  }
}

function resolveClientTarget(
  config: ExtensionConfig,
  input: WorkspaceClientTargetInput
): ResolvedClient {
  if (!input.id?.trim() && !input.clientId?.trim()) {
    throw new Error('id or clientId is required')
  }

  const matches: ResolvedClient[] = []

  if (input.kind !== 'route') {
    for (const client of config.backgroundClients) {
      if (matchesWorkspaceClient(client, input)) {
        matches.push({ kind: 'background', client })
      }
    }
  }

  if (input.kind !== 'background') {
    for (const client of config.routeClients) {
      if (matchesWorkspaceClient(client, input)) {
        matches.push({ kind: 'route', client })
      }
    }
  }

  if (matches.length === 0) {
    throw new Error('No matching client was found')
  }

  if (matches.length > 1) {
    throw new Error('Client target is ambiguous; pass kind or an exact id')
  }

  return matches[0] as ResolvedClient
}

function matchesWorkspaceClient(
  client: BackgroundClientConfig | RouteClientConfig,
  input: WorkspaceClientTargetInput
): boolean {
  const targetId = input.id?.trim()
  const targetClientId = input.clientId?.trim()

  return (
    (!targetId || client.id === targetId) &&
    (!targetClientId || client.clientId === targetClientId)
  )
}

function assertClientIdentityAvailable(
  config: ExtensionConfig,
  input: {
    id?: string
    clientId?: string
    excludeId?: string
  }
): void {
  const nextId = input.id?.trim()
  const nextClientId = input.clientId?.trim()

  if (!nextId && !nextClientId) {
    return
  }

  const existing = [
    ...config.backgroundClients,
    ...config.routeClients
  ].find(
    (client) =>
      (!input.excludeId || client.id !== input.excludeId) &&
      ((nextId && client.id === nextId) ||
        (nextClientId && client.clientId === nextClientId))
  )

  if (existing) {
    throw new Error(
      nextId && existing.id === nextId
        ? `Client id "${nextId}" is already in use`
        : `Client identifier "${nextClientId}" is already in use`
    )
  }
}

async function persistWorkspaceConfig(
  runtime: ChromeExtensionRuntime,
  nextConfig: ExtensionConfig
): Promise<ExtensionConfig> {
  runtime.currentConfig = await saveConfig(nextConfig)
  scheduleWorkspaceRefresh(runtime)
  return runtime.currentConfig
}

function scheduleWorkspaceRefresh(runtime: ChromeExtensionRuntime): void {
  globalThis.setTimeout(() => {
    void runtime.refresh()
  }, 0)
}

function assertRequiredBackgroundClientUpdate(
  client: BackgroundClientConfig,
  input: WorkspaceClientUpdateInput
): void {
  if (!isRequiredBackgroundClientId(client.id)) {
    return
  }

  if (input.enabled !== undefined && input.enabled !== DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.enabled) {
    throw new Error(
      `Background client "${client.clientName}" must remain enabled`
    )
  }

  if (
    input.nextClientId !== undefined &&
    input.nextClientId.trim() !== DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.clientId
  ) {
    throw new Error(
      `Background client "${client.clientName}" uses a reserved clientId`
    )
  }

  if (
    hasBackgroundClientExposeOverride(input) &&
    !sameStringArray(
      resolveBackgroundClientDisabledExposePaths(input) ?? [],
      DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.disabledExposePaths
    )
  ) {
    throw new Error(
      `Background client "${client.clientName}" must keep its built-in exposes fixed`
    )
  }
}

function sameStringArray(left: string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}

function hasBackgroundClientExposeOverride(
  input: WorkspaceClientCreateInput | WorkspaceClientUpdateInput
): boolean {
  return (
    input.disabledExposePaths !== undefined ||
    input.disabledTools !== undefined ||
    input.disabledResources !== undefined ||
    input.disabledSkills !== undefined
  )
}

function resolveBackgroundClientDisabledExposePaths(
  input: WorkspaceClientCreateInput | WorkspaceClientUpdateInput
): string[] | undefined {
  if (!hasBackgroundClientExposeOverride(input)) {
    return undefined
  }

  if (input.disabledExposePaths !== undefined) {
    return normalizeDisabledBackgroundExposePaths(input.disabledExposePaths)
  }

  return normalizeLegacyDisabledBackgroundExposePaths({
    disabledTools: input.disabledTools,
    disabledResources: input.disabledResources,
    disabledSkills: input.disabledSkills
  })
}
