import { ZodError } from 'zod'

import {
  DEFAULT_EXTENSION_CONFIG,
  SUPPORTED_WORKSPACE_BUNDLE_VERSION,
  type ExtensionConfig,
  buildRepositoryWorkspaceBundleUrl,
  normalizeConfig
} from '#~/shared/config.js'

import { workspaceBundleImportSchema } from './schema/root-definitions.js'

export interface WorkspaceBundleSummary {
  routeClients: number
  backgroundEnabled: boolean
  valid: boolean
  version?: string
}

function parseSemver(value: string): [number, number, number] | undefined {
  const match = value.trim().match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!match) {
    return undefined
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function isCompatibleWorkspaceBundleVersion(version: string): boolean {
  const input = parseSemver(version)
  const supported = parseSemver(SUPPORTED_WORKSPACE_BUNDLE_VERSION)

  if (!input || !supported) {
    return false
  }

  return input[0] === supported[0]
}

function parseWorkspaceBundlePayload(payload: unknown): ExtensionConfig {
  const bundle = workspaceBundleImportSchema.parse(payload)
  const version = bundle.version ?? DEFAULT_EXTENSION_CONFIG.version

  if (!isCompatibleWorkspaceBundleVersion(version)) {
    throw new Error(
      `Unsupported workspace bundle version ${version}. Supported version: ${SUPPORTED_WORKSPACE_BUNDLE_VERSION}.`
    )
  }

  return normalizeConfig({
    ...bundle,
    version
  })
}

export function serializeWorkspaceBundle(config: ExtensionConfig): string {
  return JSON.stringify(
    normalizeConfig({
      ...config,
      version: SUPPORTED_WORKSPACE_BUNDLE_VERSION
    }),
    null,
    2
  )
}

export function parseWorkspaceBundleText(text: string): ExtensionConfig {
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Workspace bundle must be valid JSON.')
  }

  return parseWorkspaceBundlePayload(parsed)
}

export function summarizeWorkspaceBundleText(text: string): WorkspaceBundleSummary {
  try {
    const bundle = parseWorkspaceBundleText(text)
    return {
      routeClients: bundle.routeClients.length,
      backgroundEnabled: bundle.backgroundClients.some((client) => client.enabled),
      valid: true,
      version: bundle.version
    }
  } catch {
    return {
      routeClients: 0,
      backgroundEnabled: false,
      valid: false
    }
  }
}

export async function fetchWorkspaceBundleFromUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return serializeWorkspaceBundle(parseWorkspaceBundlePayload(await response.json()))
}

export async function fetchWorkspaceBundleFromRepository(options: {
  provider: 'github' | 'gitlab'
  repository: string
  ref: string
}): Promise<string> {
  return fetchWorkspaceBundleFromUrl(
    buildRepositoryWorkspaceBundleUrl(options.provider, options.repository, options.ref)
  )
}

export function formatWorkspaceBundleError(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? 'Invalid workspace bundle.'
  }

  return error instanceof Error ? error.message : String(error)
}
