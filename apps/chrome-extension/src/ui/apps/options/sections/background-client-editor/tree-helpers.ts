export {
  buildBackgroundTree,
  getPreferredBackgroundAssetId,
  resolveInitialBackgroundAssetId
} from './tree-helpers/tree-data.js'
export {
  computeBackgroundFolderRenamePaths,
  getBackgroundDisplayPath,
  getSharedBackgroundDisplayPrefix,
  normalizeBackgroundPath,
  normalizeBackgroundTreeLeaf,
  pathExistsInBackgroundExposes,
  replaceBackgroundPathLeaf,
  replaceTreeFolderLeaf,
  restoreBackgroundTreePath,
  splitBackgroundPath,
  stripLeadingSlash
} from './tree-helpers/path-utils.js'
export {
  commitBackgroundRename,
  getBackgroundRenameError
} from './tree-helpers/rename.js'
export {
  getCollapsedBackgroundSelectionTarget,
  getSelectedBackgroundAssetId,
  getSelectedBackgroundFolderPath,
  handleBackgroundExpandableItemClick,
  handleBackgroundExpandedItemsChange
} from './tree-helpers/selection.js'
