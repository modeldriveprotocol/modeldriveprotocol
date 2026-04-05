import type { MouseEvent as ReactMouseEvent } from 'react'

import {
  deriveDisabledBackgroundExposePaths,
  type BackgroundClientConfig,
  type BackgroundExposeAsset,
  type ExtensionConfig
} from '#~/shared/config.js'
import {
  toggleEnabledAsset,
  toggleEnabledFolder
} from '../asset-tree-shared.js'
import {
  commitBackgroundRename,
  getBackgroundDisplayPath,
  stripLeadingSlash
} from './tree-helpers.js'
import type {
  BackgroundContextMenuState,
  BackgroundContextMenuTarget,
  BackgroundRenameTarget
} from './types.js'

export function useBackgroundClientEditorActions({
  assetEnabled,
  client,
  draft,
  onChange,
  renameError,
  renameTarget,
  setContextMenu,
  setDisplayedAssetId,
  setExpandedFolders,
  setRenameTarget,
  setSelectedItemId,
  sharedDisplayPrefix
}: {
  assetEnabled: Map<BackgroundExposeAsset['id'], boolean>
  client: BackgroundClientConfig
  draft: ExtensionConfig
  onChange: (config: ExtensionConfig) => void
  renameError: boolean
  renameTarget: BackgroundRenameTarget | undefined
  setContextMenu: (state: BackgroundContextMenuState | undefined) => void
  setDisplayedAssetId: (
    assetId: BackgroundExposeAsset['id'] | undefined
  ) => void
  setExpandedFolders: (updater: (paths: string[]) => string[]) => void
  setRenameTarget: (
    target:
      | BackgroundRenameTarget
      | undefined
      | ((current: BackgroundRenameTarget | undefined) => BackgroundRenameTarget | undefined)
  ) => void
  setSelectedItemId: (itemId: string) => void
  sharedDisplayPrefix: string | undefined
}) {
  function updateClient(next: BackgroundClientConfig) {
    onChange({
      ...draft,
      backgroundClients: draft.backgroundClients.map((item) =>
        item.id === next.id ? next : item
      )
    })
  }

  function updateExpose(
    id: BackgroundExposeAsset['id'],
    updater: (asset: BackgroundExposeAsset) => BackgroundExposeAsset
  ) {
    const exposes = client.exposes.map((asset) =>
      asset.id === id ? updater(asset) : asset
    )

    updateClient({
      ...client,
      exposes,
      disabledExposePaths: deriveDisabledBackgroundExposePaths(exposes)
    })
  }

  function commitBackgroundExposes(exposes: BackgroundExposeAsset[]) {
    updateClient({
      ...client,
      exposes,
      disabledExposePaths: deriveDisabledBackgroundExposePaths(exposes)
    })
  }

  function toggleBackgroundAssetEnabled(assetId: BackgroundExposeAsset['id']) {
    const nextExposes = toggleEnabledAsset(client.exposes, assetId, assetEnabled)

    if (nextExposes) {
      commitBackgroundExposes(nextExposes)
    }
  }

  function toggleBackgroundFolderEnabled(folderPath: string) {
    const nextExposes = toggleEnabledFolder(
      client.exposes,
      client.exposes.map((asset) => ({
        assetId: asset.id,
        path: stripLeadingSlash(
          getBackgroundDisplayPath(asset.path, sharedDisplayPrefix)
        )
      })),
      folderPath,
      assetEnabled
    )

    if (nextExposes) {
      commitBackgroundExposes(nextExposes)
    }
  }

  function openContextMenu(
    event: ReactMouseEvent,
    target: BackgroundContextMenuTarget
  ) {
    event.preventDefault()
    event.stopPropagation()
    setRenameTarget(undefined)
    setContextMenu({
      kind: target.kind,
      assetId: target.assetId,
      folderPath: target.folderPath,
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6
    })
  }

  function startRename(target: BackgroundRenameTarget, itemId: string) {
    setRenameTarget(target)
    setSelectedItemId(itemId)

    if (target.kind === 'asset') {
      setDisplayedAssetId(target.assetId)
    }
  }

  function commitRename() {
    commitBackgroundRename(
      client,
      renameTarget,
      renameError,
      sharedDisplayPrefix,
      setRenameTarget,
      setSelectedItemId,
      updateClient
    )
  }

  return {
    commitRename,
    openContextMenu,
    startRename,
    toggleBackgroundAssetEnabled,
    toggleBackgroundFolderEnabled,
    updateClient,
    updateExpose
  }
}
