import {
  getBackgroundExposeDefinition,
  type BackgroundExposeAsset
} from '#~/shared/config/background-assets.js'
import {
  ROOT_ROUTE_SKILL_PATH,
  type RouteClientConfig,
  type RouteExposeAsset,
  type RouteSelectorResource
} from '#~/shared/config.js'
import type { BackgroundClientConfig } from '#~/shared/config.js'

import type { SidepanelAssetPreviewEntry } from './client-asset-preview.js'

export const BACKGROUND_ROOT_SKILL_PATH = '/SKILL.md'

export function createBackgroundAssetPreviewEntries(
  client: Pick<BackgroundClientConfig, 'exposes'>
): SidepanelAssetPreviewEntry[] {
  return client.exposes
    .filter((asset) => asset.enabled)
    .map((asset) => {
      const definition = getBackgroundExposeDefinition(asset.id)
      return {
        path: asset.path,
        displayPath: toBackgroundDisplayPath(asset.path),
        contentKind: definition?.sourceKind === 'markdown' ? 'markdown' : 'code',
        content: asset.source
      } satisfies SidepanelAssetPreviewEntry
    })
}

export function createRouteAssetPreviewEntries(
  client: Pick<RouteClientConfig, 'exposes'>
): SidepanelAssetPreviewEntry[] {
  return client.exposes
    .filter(isPreviewableRouteAsset)
    .map((asset) => toRouteAssetPreviewEntry(asset))
}

function toRouteAssetPreviewEntry(
  asset: Exclude<RouteExposeAsset, { kind: 'folder' }>
): SidepanelAssetPreviewEntry {
  switch (asset.kind) {
    case 'skill':
      return {
        path: asset.path,
        contentKind: 'markdown',
        content: asset.content
      }
    case 'flow':
      return {
        path: asset.path,
        contentKind: asset.mode === 'script' ? 'code' : 'markdown',
        content:
          asset.mode === 'script' ? asset.scriptSource : summarizeRecordingAsset(asset)
      }
    case 'resource':
      return {
        path: asset.path,
        contentKind: asset.scriptSource ? 'code' : 'markdown',
        content: asset.scriptSource ?? summarizeResourceAsset(asset)
      }
  }
}

function isPreviewableRouteAsset(
  asset: RouteExposeAsset
): asset is Exclude<RouteExposeAsset, { kind: 'folder' }> {
  return asset.kind !== 'folder' && asset.enabled
}

function summarizeRecordingAsset(
  asset: Extract<RouteExposeAsset, { kind: 'flow' }>
): string {
  const lines = [
    `# ${asset.name}`,
    '',
    asset.description || 'Recorded flow asset.',
    '',
    `- Path: \`${asset.path}\``,
    `- Steps: ${asset.steps.length}`,
    `- Mode: ${asset.mode}`
  ]

  if (asset.startUrl) {
    lines.push(`- Start URL: \`${asset.startUrl}\``)
  }

  return lines.join('\n')
}

function summarizeResourceAsset(asset: RouteSelectorResource): string {
  const lines = [
    `# ${asset.name}`,
    '',
    asset.description || 'Captured page resource.',
    '',
    `- Path: \`${asset.path}\``,
    `- Selector: \`${asset.selector}\``
  ]

  if (asset.url) {
    lines.push(`- URL: \`${asset.url}\``)
  }

  if (asset.text) {
    lines.push('', '## Text', '', asset.text)
  }

  return lines.join('\n')
}

export function getPreferredPreviewPath(
  entries: readonly SidepanelAssetPreviewEntry[],
  preferredPath: string
): string | undefined {
  return entries.find((entry) => entry.path === preferredPath)?.path ?? entries[0]?.path
}

export { ROOT_ROUTE_SKILL_PATH }

function toBackgroundDisplayPath(path: string): string {
  return path.replace(/^\/+/, '') || 'SKILL.md'
}
