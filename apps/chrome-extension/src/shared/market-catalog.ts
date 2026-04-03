import { ZodError, z } from 'zod'

import {
  DEFAULT_EXTENSION_CONFIG,
  SUPPORTED_MARKET_CATALOG_VERSION,
  type ClientIconKey,
  type MarketSourceConfig,
  type RouteClientConfig,
  normalizeConfig
} from '#~/shared/config.js'
import { createStableId } from '#~/shared/utils.js'

const clientIconSchema = z.enum([
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
])

const semverSchema = z
  .string()
  .trim()
  .regex(/^\d+\.\d+\.\d+$/, 'Expected a semver version like 1.0.0.')
const routeRuleSchema = z.object({
  id: z.string().trim().min(1).optional(),
  mode: z.enum(['pathname-prefix', 'pathname-exact', 'url-contains', 'regex']),
  value: z.string().trim().min(1)
})

const recordedFlowStepSchema = z.object({
  id: z.string().trim().min(1).optional(),
  type: z.enum(['click', 'fill', 'pressKey']),
  selector: z.string().trim().min(1),
  alternativeSelectors: z.array(z.string().trim().min(1)).default([]),
  tagName: z.string().trim().min(1),
  classes: z.array(z.string().trim().min(1)).default([]),
  timestampOffsetMs: z.number().nonnegative().default(0),
  text: z.string().optional(),
  label: z.string().optional(),
  inputType: z.string().optional(),
  value: z.string().optional(),
  key: z.string().optional(),
  code: z.string().optional()
})

const recordingSchema = z.object({
  id: z.string().trim().min(1).optional(),
  path: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1),
  description: z.string().default(''),
  mode: z.enum(['recording', 'script']).default('recording'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  startUrl: z.string().url().optional(),
  capturedFeatures: z.array(z.string().trim().min(1)).default([]),
  steps: z.array(recordedFlowStepSchema).default([]),
  scriptSource: z.string().default('')
})

const selectorResourceSchema = z.object({
  id: z.string().trim().min(1).optional(),
  path: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1),
  description: z.string().default(''),
  createdAt: z.string().optional(),
  url: z.string().url().optional(),
  selector: z.string().trim().min(1),
  alternativeSelectors: z.array(z.string().trim().min(1)).default([]),
  tagName: z.string().trim().min(1),
  classes: z.array(z.string().trim().min(1)).default([]),
  text: z.string().optional(),
  attributes: z.record(z.string(), z.string()).default({})
})

const skillEntrySchema = z.object({
  id: z.string().trim().min(1).optional(),
  path: z.string().trim().min(1),
  metadata: z
    .object({
      title: z.string().trim().min(1).optional(),
      summary: z.string().default(''),
      queryParameters: z
        .array(
          z.object({
            id: z.string().trim().min(1).optional(),
            key: z.string().trim().min(1),
            summary: z.string().default(''),
            type: z.enum(['string', 'number', 'boolean']).default('string')
          })
        )
        .default([]),
      headerParameters: z
        .array(
          z.object({
            id: z.string().trim().min(1).optional(),
            key: z.string().trim().min(1),
            summary: z.string().default(''),
            type: z.enum(['string', 'number', 'boolean']).default('string')
          })
        )
        .default([])
    })
    .optional(),
  title: z.string().trim().min(1).optional(),
  summary: z.string().default(''),
  queryParameters: z
    .array(
      z.object({
        id: z.string().trim().min(1).optional(),
        key: z.string().trim().min(1),
        summary: z.string().default(''),
        type: z.enum(['string', 'number', 'boolean']).default('string')
      })
    )
    .default([]),
  headerParameters: z
    .array(
      z.object({
        id: z.string().trim().min(1).optional(),
        key: z.string().trim().min(1),
        summary: z.string().default(''),
        type: z.enum(['string', 'number', 'boolean']).default('string')
      })
    )
    .default([]),
  content: z.string().default('')
})

const skillFolderSchema = z.object({
  id: z.string().trim().min(1).optional(),
  path: z.string().trim().min(1)
})

const routeClientTemplateSchema = z.object({
  enabled: z.boolean().optional(),
  clientId: z.string().trim().min(1).optional(),
  clientName: z.string().trim().min(1).optional(),
  clientDescription: z.string().optional(),
  icon: clientIconSchema.optional(),
  matchPatterns: z.array(z.string().trim().min(1)).default([]),
  routeRules: z.array(routeRuleSchema).default([]),
  autoInjectBridge: z.boolean().optional(),
  pathScriptSource: z.string().default(''),
  toolScriptSource: z.string().optional(),
  recordings: z.array(recordingSchema).default([]),
  selectorResources: z.array(selectorResourceSchema).default([]),
  skillFolders: z.array(skillFolderSchema).default([]),
  skillEntries: z.array(skillEntrySchema).default([])
})

const marketCatalogClientSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  summary: z.string().default(''),
  icon: clientIconSchema.default('route'),
  tags: z.array(z.string().trim().min(1)).default([]),
  client: routeClientTemplateSchema
})

const marketCatalogSchema = z.object({
  version: semverSchema,
  title: z.string().trim().min(1).optional(),
  clients: z.array(marketCatalogClientSchema).default([])
})

type ParsedMarketCatalog = z.infer<typeof marketCatalogSchema>
type ParsedMarketCatalogClient = z.infer<typeof marketCatalogClientSchema>

export interface MarketCatalogClientEntry {
  id: string
  title: string
  summary: string
  icon: ClientIconKey
  tags: string[]
  template: RouteClientConfig
}

export interface MarketCatalogSourceData {
  source: MarketSourceConfig
  title: string
  version: string
  compatible: boolean
  clients: MarketCatalogClientEntry[]
}

export interface MarketCatalogSourceResult extends MarketCatalogSourceData {
  error?: string
}

function parseSemver(value: string): [number, number, number] | undefined {
  const match = value.trim().match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!match) {
    return undefined
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

export function isCompatibleCatalogVersion(version: string): boolean {
  const input = parseSemver(version)
  const supported = parseSemver(SUPPORTED_MARKET_CATALOG_VERSION)

  if (!input || !supported) {
    return false
  }

  return input[0] === supported[0]
}

export function normalizeCatalogSourceTitle(
  source: MarketSourceConfig,
  value: string | undefined
): string {
  const title = value?.trim()
  if (title) {
    return title
  }

  if (source.kind === 'repository' && source.repository && source.ref) {
    return `${source.repository}@${source.ref}`
  }

  try {
    return new URL(source.url).hostname
  } catch {
    return source.url
  }
}

function buildTemplateClient(
  entry: ParsedMarketCatalogClient
): RouteClientConfig {
  const template = entry.client

  return normalizeConfig({
    ...DEFAULT_EXTENSION_CONFIG,
    routeClients: [
      {
        kind: 'route',
        id: `market-template-${entry.id}`,
        enabled: template.enabled ?? true,
        clientId: template.clientId ?? `mdp-market-${entry.id}`,
        clientName: template.clientName ?? entry.title,
        clientDescription: template.clientDescription ?? entry.summary,
        icon: template.icon ?? entry.icon,
        matchPatterns: template.matchPatterns,
        routeRules: template.routeRules,
        autoInjectBridge: template.autoInjectBridge ?? true,
        pathScriptSource: template.pathScriptSource || template.toolScriptSource || '',
        recordings: template.recordings,
        selectorResources: template.selectorResources,
        skillFolders: template.skillFolders,
        skillEntries: template.skillEntries
      }
    ]
  }).routeClients[0]
}

function buildCatalogResult(
  source: MarketSourceConfig,
  payload: ParsedMarketCatalog
): MarketCatalogSourceResult {
  const compatible = isCompatibleCatalogVersion(payload.version)
  const title = normalizeCatalogSourceTitle(source, payload.title)
  const clients = compatible
    ? payload.clients.map((entry) => ({
        id: entry.id,
        title: entry.title,
        summary: entry.summary,
        icon: entry.icon,
        tags: entry.tags,
        template: buildTemplateClient(entry)
      }))
    : []

  return {
    source,
    title,
    version: payload.version,
    compatible,
    clients,
    ...(compatible
      ? {}
      : {
          error: `Unsupported catalog version ${payload.version}. Supported version: ${SUPPORTED_MARKET_CATALOG_VERSION}.`
        })
  }
}

export function formatCatalogError(error: unknown): string {
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0]
    return typeof firstIssue?.message === 'string'
      ? firstIssue.message
      : 'Invalid market catalog payload.'
  }

  return error instanceof Error ? error.message : String(error)
}

export async function fetchMarketCatalog(
  source: MarketSourceConfig
): Promise<MarketCatalogSourceResult> {
  try {
    const response = await fetch(source.url, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const payload = marketCatalogSchema.parse(await response.json())
    return buildCatalogResult(source, payload)
  } catch (error) {
    return {
      source,
      title: normalizeCatalogSourceTitle(source, undefined),
      version: '',
      compatible: false,
      clients: [],
      error: formatCatalogError(error)
    }
  }
}

export function createMarketCatalogDigest(
  result: MarketCatalogSourceResult
): string {
  return createStableId(
    'market-catalog',
    JSON.stringify({
      source: result.source.url,
      title: result.title,
      version: result.version,
      compatible: result.compatible,
      clients: result.clients.map((client) => ({
        id: client.id,
        title: client.title,
        summary: client.summary,
        icon: client.icon,
        tags: client.tags,
        template: client.template
      })),
      error: result.error ?? null
    })
  )
}
