export {
  buildBackgroundTree,
  getPreferredBackgroundAssetId,
  resolveInitialBackgroundAssetId
} from './tree-helpers/tree-data.js'
export {
  createUniqueBackgroundDisplayPath,
  computeBackgroundFolderRenamePaths,
  getBackgroundDisplayPath,
  getSharedBackgroundDisplayPrefix,
  isBackgroundTreePathWithinFolder,
  normalizeBackgroundPath,
  normalizeBackgroundTreeLeaf,
  pathExistsInBackgroundExposes,
  replaceBackgroundDisplayPathPrefix,
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
  handleBackgroundExpandedItemsChange
} from './tree-helpers/selection.js'
