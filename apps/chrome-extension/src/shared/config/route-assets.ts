import { createRequestId } from '../utils.js'

import type {
  RouteClientConfig,
  RouteClientRecording,
  RouteExposeAsset,
  RouteSkillEntry,
  RouteSkillFolder,
  RouteSkillMetadata,
  RouteSelectorResource
} from './types.js'

export const ROOT_ROUTE_SKILL_PATH = 'SKILL.md'

export function isRouteRecordingAsset(
  asset: RouteExposeAsset
): asset is RouteClientRecording {
  return asset.kind === 'flow'
}

export function isRouteSelectorResourceAsset(
  asset: RouteExposeAsset
): asset is RouteSelectorResource {
  return asset.kind === 'resource'
}

export function isRouteSkillEntryAsset(
  asset: RouteExposeAsset
): asset is RouteSkillEntry {
  return asset.kind === 'skill'
}

export function isRouteSkillFolderAsset(
  asset: RouteExposeAsset
): asset is RouteSkillFolder {
  return asset.kind === 'folder'
}

export function getRouteClientRecordings(
  client: Pick<RouteClientConfig, 'exposes'>
): RouteClientRecording[] {
  return client.exposes.filter(isRouteRecordingAsset)
}

export function getRouteClientSelectorResources(
  client: Pick<RouteClientConfig, 'exposes'>
): RouteSelectorResource[] {
  return client.exposes.filter(isRouteSelectorResourceAsset)
}

export function getRouteClientSkillEntries(
  client: Pick<RouteClientConfig, 'exposes'>
): RouteSkillEntry[] {
  return client.exposes.filter(isRouteSkillEntryAsset)
}

export function getRouteClientSkillFolders(
  client: Pick<RouteClientConfig, 'exposes'>
): RouteSkillFolder[] {
  return client.exposes.filter(isRouteSkillFolderAsset)
}

export function cloneRouteExposeAssets(
  exposes: RouteExposeAsset[]
): RouteExposeAsset[] {
  return exposes.map((asset) => {
    switch (asset.kind) {
      case 'flow':
        return {
          ...asset,
          capturedFeatures: [...asset.capturedFeatures],
          steps: asset.steps.map((step) => ({
            ...step,
            alternativeSelectors: [...step.alternativeSelectors],
            classes: [...step.classes]
          }))
        }
      case 'resource':
        return {
          ...asset,
          alternativeSelectors: [...asset.alternativeSelectors],
          classes: [...asset.classes],
          attributes: { ...asset.attributes }
        }
      case 'skill':
        return {
          ...asset,
          metadata: {
            ...asset.metadata,
            queryParameters: asset.metadata.queryParameters.map((parameter) => ({
              ...parameter
            })),
            headerParameters: asset.metadata.headerParameters.map(
              (parameter) => ({
                ...parameter
              })
            )
          }
        }
      case 'folder':
        return { ...asset }
    }
  })
}

export function createRootRouteSkillEntry(): RouteSkillEntry {
  return {
    kind: 'skill',
    id: createRequestId('skill'),
    path: ROOT_ROUTE_SKILL_PATH,
    metadata: createDefaultRootRouteSkillMetadata(),
    content: ''
  }
}

export function createDefaultRootRouteSkillMetadata(): RouteSkillMetadata {
  return {
    title: 'Client Guide',
    summary: '',
    queryParameters: [],
    headerParameters: []
  }
}

export function ensureRootRouteSkillEntry(
  skillEntries: RouteSkillEntry[]
): RouteSkillEntry[] {
  let foundRoot = false
  const normalized = skillEntries.flatMap((entry) => {
    if (!isRootRouteSkillPath(entry.path)) {
      return [entry]
    }

    if (foundRoot) {
      return []
    }

    foundRoot = true
    return [
      {
        ...entry,
        kind: 'skill' as const,
        path: ROOT_ROUTE_SKILL_PATH
      }
    ]
  })

  return foundRoot ? normalized : [createRootRouteSkillEntry(), ...normalized]
}

export function ensureRootRouteSkillAsset(
  exposes: RouteExposeAsset[]
): RouteExposeAsset[] {
  const skills = ensureRootRouteSkillEntry(
    exposes.filter(isRouteSkillEntryAsset).map((asset) => ({ ...asset }))
  )
  const nonSkills = exposes.filter((asset) => !isRouteSkillEntryAsset(asset))
  return [...skills, ...nonSkills]
}

export function syncRouteClientAssetViews(
  client: Omit<
    RouteClientConfig,
    'recordings' | 'selectorResources' | 'skillEntries' | 'skillFolders'
  >
): RouteClientConfig {
  return {
    ...client,
    recordings: getRouteClientRecordings(client),
    selectorResources: getRouteClientSelectorResources(client),
    skillEntries: getRouteClientSkillEntries(client),
    skillFolders: getRouteClientSkillFolders(client)
  }
}

export function getRootRouteSkillId(
  skillEntries: RouteSkillEntry[]
): string | undefined {
  return skillEntries.find((entry) => isRootRouteSkillPath(entry.path))?.id
}

export function isRootRouteSkillPath(path: string): boolean {
  const normalized = normalizeRouteSkillEntryPath(path)
  return normalized === ROOT_ROUTE_SKILL_PATH
}

export function getRouteSkillAssetLabel(path: string): string {
  return basename(path)
}

export function normalizeRouteRecordingPath(
  path: string | undefined
): string | undefined {
  return normalizeRouteAssetPath(path)
}

export function normalizeRouteResourcePath(
  path: string | undefined
): string | undefined {
  return normalizeRouteAssetPath(path)
}

export function normalizeRouteSkillEntryPath(
  path: string | undefined
): string | undefined {
  const segments = path
    ?.split('/')
    .map(normalizeRouteSkillSegment)
    .filter((segment): segment is string => Boolean(segment))

  if (!segments?.length) {
    return undefined
  }

  const leaf = segments.at(-1)

  if (!leaf) {
    return undefined
  }

  if (isLegacyRootSkillLeaf(leaf)) {
    return ROOT_ROUTE_SKILL_PATH
  }

  if (isSkillLeaf(leaf)) {
    return [...segments.slice(0, -1), 'SKILL.md'].join('/')
  }

  return [...segments, 'SKILL.md'].join('/')
}

export function normalizeRouteSkillFolderPath(
  path: string | undefined
): string | undefined {
  const segments = path
    ?.split('/')
    .map(normalizeRouteSkillSegment)
    .filter((segment): segment is string => Boolean(segment))

  if (!segments?.length) {
    return undefined
  }

  const leaf = segments.at(-1)

  if (!leaf || isSkillLeaf(leaf) || isLegacyRootSkillLeaf(leaf)) {
    return undefined
  }

  return segments.join('/')
}

export function summarizeRouteAssetKinds(client: Pick<RouteClientConfig, 'exposes'>) {
  const recordings = getRouteClientRecordings(client)
  const selectorResources = getRouteClientSelectorResources(client)
  const skillEntries = getRouteClientSkillEntries(client)

  return {
    recordingCount: recordings.length,
    selectorResourceCount: selectorResources.length,
    skillCount: skillEntries.length
  }
}

function normalizeRouteAssetPath(path: string | undefined): string | undefined {
  const segments = path
    ?.split('/')
    .map((segment) => normalizeRouteAssetSegment(segment))
    .filter((segment): segment is string => Boolean(segment))

  if (!segments?.length) {
    return undefined
  }

  return segments.join('/')
}

function normalizeRouteSkillSegment(segment: string): string | undefined {
  const trimmed = segment.trim()

  if (!trimmed) {
    return undefined
  }

  if (trimmed === '.ai') {
    return '.ai'
  }

  if (isSkillLeaf(trimmed) || isLegacyRootSkillLeaf(trimmed)) {
    return 'SKILL.md'
  }

  return normalizeRouteAssetSegment(trimmed)
}

function normalizeRouteAssetSegment(segment: string): string | undefined {
  const normalized = segment
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')

  return normalized || undefined
}

function isLegacyRootSkillLeaf(value: string): boolean {
  return value === 'skill-md'
}

function isSkillLeaf(value: string): boolean {
  return value === 'skill.md' || value === 'SKILL.md'
}

function basename(path: string): string {
  return path.split('/').filter(Boolean).at(-1) ?? path
}
