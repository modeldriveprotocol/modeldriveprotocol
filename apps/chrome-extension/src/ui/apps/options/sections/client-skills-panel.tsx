import AddOutlined from '@mui/icons-material/AddOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import CreateNewFolderOutlined from '@mui/icons-material/CreateNewFolderOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import FolderOutlined from '@mui/icons-material/FolderOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import TuneOutlined from '@mui/icons-material/TuneOutlined'
import {
  Box,
  ButtonBase,
  Chip,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  InputAdornment
} from '@mui/material'
import { SimpleTreeView, TreeItem, useSimpleTreeViewApiRef } from '@mui/x-tree-view'
import type { KeyboardEvent, MouseEvent, ReactNode, SyntheticEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import type {
  RouteClientConfig,
  RouteSkillEntry,
  RouteSkillFolder,
  RouteSkillMetadata,
  RouteSkillParameter
} from '#~/shared/config.js'
import {
  MonacoCodeEditor,
  type MonacoCodeEditorHandle
} from '../../../foundation/monaco-editor.js'
import { useI18n } from '../../../i18n/provider.js'
import { ToolbarIcon } from '../shared.js'
import { SkillParametersDialog } from './skill-parameters-dialog.js'
import { createLocalId } from '../types.js'

const DEFAULT_SKILL_MARKDOWN = '# Skill\n\nDescribe the workflow here.\n'

function createDefaultSkillMetadata(title: string): RouteSkillMetadata {
  return {
    title,
    summary: '',
    queryParameters: [],
    headerParameters: []
  }
}

export type SkillTreeNode =
  | {
      kind: 'folder'
      id: string
      path: string
      label: string
      children: SkillTreeNode[]
    }
  | {
      kind: 'skill'
      id: string
      skillId: string
      path: string
      label: string
      searchText: string
    }

type SkillTemplateToken = {
  token: string
  summary: string
}

type TreeRenameTarget =
  | {
      kind: 'folder'
      path: string
      value: string
    }
  | {
      kind: 'skill'
      skillId: string
      value: string
    }

type VisibleTreeNode = {
  kind: SkillTreeNode['kind']
  id: string
  path: string
  parentPath?: string
  skillId?: string
}

export function ClientSkillsPanel({
  client,
  hideHeader = false,
  hideTree = false,
  onChange,
  onSelectionChange,
  selectedFolderPath: controlledSelectedFolderPath,
  selectedSkillId: controlledSelectedSkillId
}: {
  client: RouteClientConfig
  hideHeader?: boolean
  hideTree?: boolean
  onChange: (client: RouteClientConfig) => void
  onSelectionChange?: (selection: {
    folderPath?: string
    skillId?: string
  }) => void
  selectedFolderPath?: string
  selectedSkillId?: string
}) {
  const { t } = useI18n()
  const plainLayout = hideTree
  const [selectedSkillId, setSelectedSkillId] = useState<string | undefined>(
    controlledSelectedSkillId
  )
  const [selectedFolderPath, setSelectedFolderPath] = useState<
    string | undefined
  >(controlledSelectedFolderPath)
  const [expandedFolders, setExpandedFolders] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [treeRenameTarget, setTreeRenameTarget] = useState<TreeRenameTarget>()
  const [createMenuAnchor, setCreateMenuAnchor] = useState<HTMLElement | null>(
    null
  )
  const [advancedModeOpen, setAdvancedModeOpen] = useState(false)
  const editorRef = useRef<MonacoCodeEditorHandle | null>(null)
  const treeApiRef = useSimpleTreeViewApiRef()
  const folderPaths = useMemo(
    () => listTreeFolders(client.skillEntries, client.skillFolders),
    [client.skillEntries, client.skillFolders]
  )

  useEffect(() => {
    if (
      controlledSelectedSkillId === undefined &&
      controlledSelectedFolderPath === undefined
    ) {
      return
    }

    setSelectedSkillId(controlledSelectedSkillId)
    setSelectedFolderPath(controlledSelectedFolderPath)
  }, [controlledSelectedFolderPath, controlledSelectedSkillId])

  useEffect(() => {
    setSelectedSkillId((current) =>
      selectedFolderPath
        ? undefined
        : current && client.skillEntries.some((skill) => skill.id === current)
        ? current
        : client.skillEntries[0]?.id
    )
  }, [client.id, client.skillEntries, selectedFolderPath])

  useEffect(() => {
    setSelectedFolderPath((current) =>
      current && folderPaths.includes(current) ? current : undefined
    )
  }, [folderPaths])

  useEffect(() => {
    onSelectionChange?.({
      folderPath: selectedFolderPath,
      skillId: selectedFolderPath ? undefined : selectedSkillId
    })
  }, [onSelectionChange, selectedFolderPath, selectedSkillId])

  const selectedSkill = selectedFolderPath
    ? undefined
    : client.skillEntries.find((skill) => skill.id === selectedSkillId) ??
      client.skillEntries[0]
  const selectedFolderSkills = useMemo(
    () =>
      selectedFolderPath
        ? client.skillEntries.filter((skill) =>
            isPathWithinFolder(skill.path, selectedFolderPath)
          )
        : [],
    [client.skillEntries, selectedFolderPath]
  )
  const sortedSelectedFolderSkills = useMemo(
    () =>
      [...selectedFolderSkills].sort((left, right) =>
        left.path.localeCompare(right.path)
      ),
    [selectedFolderSkills]
  )

  useEffect(() => {
    if (!selectedSkill) {
      return
    }

    setExpandedFolders((current) => {
      const next = new Set(current)

      for (const folderPath of listAncestorFolders(selectedSkill.path)) {
        next.add(folderPath)
      }

      return [...next]
    })
  }, [selectedSkill?.id, selectedSkill?.path])

  const tree = useMemo(
    () => buildSkillTree(client.skillEntries, client.skillFolders),
    [client.skillEntries, client.skillFolders]
  )
  const filteredTree = useMemo(
    () => filterSkillTree(tree, searchQuery),
    [searchQuery, tree]
  )
  const forcedExpandedFolders = useMemo(
    () => listFolderPaths(filteredTree),
    [filteredTree]
  )
  const expandedItemIds = useMemo(
    () =>
      (
        searchQuery.trim()
          ? [...new Set([...expandedFolders, ...forcedExpandedFolders])]
          : expandedFolders
      ).map((path) => `folder:${path}`),
    [expandedFolders, forcedExpandedFolders, searchQuery]
  )
  const selectedTreeItemId = selectedFolderPath
    ? `folder:${selectedFolderPath}`
    : selectedSkill
    ? `skill:${selectedSkill.id}`
    : undefined
  const availableTokens = useMemo(
    () => buildSkillTokens(selectedSkill),
    [selectedSkill]
  )
  const treeRenameState = useMemo(
    () =>
      getTreeRenameState(
        treeRenameTarget,
        client.skillEntries,
        client.skillFolders,
        t
      ),
    [client.skillEntries, client.skillFolders, t, treeRenameTarget]
  )

  useEffect(() => {
    setTreeRenameTarget((current) => {
      if (!current) {
        return current
      }

      if (
        current.kind === 'skill' &&
        current.skillId !== selectedSkill?.id
      ) {
        return undefined
      }

      if (
        current.kind === 'folder' &&
        current.path !== selectedFolderPath
      ) {
        return undefined
      }

      return current
    })
  }, [selectedFolderPath, selectedSkill?.id])

  useEffect(() => {
    setAdvancedModeOpen(false)
  }, [selectedSkill?.id])

  function updateSkillAssets(
    updater: (assets: {
      skillEntries: RouteSkillEntry[]
      skillFolders: RouteSkillFolder[]
    }) => {
      skillEntries: RouteSkillEntry[]
      skillFolders: RouteSkillFolder[]
    }
  ) {
    const next = updater({
      skillEntries: client.skillEntries,
      skillFolders: client.skillFolders
    })

    onChange({
      ...client,
      skillEntries: next.skillEntries,
      skillFolders: cleanupSkillFolders(next.skillFolders, next.skillEntries)
    })
  }

  function updateSkills(
    updater: (skills: RouteSkillEntry[]) => RouteSkillEntry[]
  ) {
    updateSkillAssets(({ skillEntries, skillFolders }) => ({
      skillEntries: updater(skillEntries),
      skillFolders
    }))
  }

  function updateFolders(
    updater: (folders: RouteSkillFolder[]) => RouteSkillFolder[]
  ) {
    updateSkillAssets(({ skillEntries, skillFolders }) => ({
      skillEntries,
      skillFolders: updater(skillFolders)
    }))
  }

  function updateSkill(
    skillId: string,
    updater: (skill: RouteSkillEntry) => RouteSkillEntry
  ) {
    updateSkills((skills) =>
      skills.map((skill) => (skill.id === skillId ? updater(skill) : skill))
    )
  }

  function updateSkillMetadata(
    skillId: string,
    updater: (metadata: RouteSkillMetadata) => RouteSkillMetadata
  ) {
    updateSkill(skillId, (skill) => ({
      ...skill,
      metadata: updater(skill.metadata)
    }))
  }

  function resolveCurrentFolderPath(): string {
    return (
      selectedFolderPath ?? (selectedSkill ? dirname(selectedSkill.path) : '')
    )
  }

  function addSkill(parentPath = resolveCurrentFolderPath()) {
    const nextPath = createUniqueSkillPath(
      client.skillEntries.map((skill) => skill.path),
      parentPath,
      'new-skill'
    )
    const nextSkill: RouteSkillEntry = {
      id: createLocalId('skill'),
      path: nextPath,
      metadata: createDefaultSkillMetadata(t('options.assets.skills.newTitle')),
      content: DEFAULT_SKILL_MARKDOWN
    }

    setSearchQuery('')
    updateSkills((skills) => [...skills, nextSkill])
    setSelectedSkillId(nextSkill.id)
    setSelectedFolderPath(undefined)
    setExpandedFolders((current) => [
      ...new Set([...current, ...listAncestorFolders(nextSkill.path)])
    ])
    setTreeRenameTarget({
      kind: 'skill',
      skillId: nextSkill.id,
      value: basename(nextSkill.path)
    })
  }

  function addFolder(parentPath = resolveCurrentFolderPath()) {
    const nextFolderPath = createUniqueFolderPath(
      client.skillEntries.map((skill) => skill.path),
      client.skillFolders,
      parentPath,
      'new-folder'
    )

    setSearchQuery('')
    updateFolders((folders) => [
      ...folders,
      {
        id: createLocalId('skill-folder'),
        path: nextFolderPath
      }
    ])
    setSelectedFolderPath(nextFolderPath)
    setSelectedSkillId(undefined)
    setExpandedFolders((current) => [
      ...new Set([
        ...current,
        ...listAncestorFolders(nextFolderPath),
        nextFolderPath
      ])
    ])
    setTreeRenameTarget({
      kind: 'folder',
      path: nextFolderPath,
      value: basename(nextFolderPath)
    })
  }

  function deleteSkill(skillId: string) {
    updateSkills((skills) => skills.filter((skill) => skill.id !== skillId))
    setSelectedSkillId((current) => (current === skillId ? undefined : current))
  }

  function addParameter(skillId: string, kind: 'query' | 'header') {
    updateSkillMetadata(skillId, (metadata) => ({
      ...metadata,
      ...(kind === 'query'
        ? {
            queryParameters: [
              ...metadata.queryParameters,
              {
                id: createLocalId('skill-query'),
                key: '',
                summary: '',
                type: 'string'
              }
            ]
          }
        : {
            headerParameters: [
              ...metadata.headerParameters,
              {
                id: createLocalId('skill-header'),
                key: '',
                summary: '',
                type: 'string'
              }
            ]
          })
    }))
  }

  function updateParameter(
    skillId: string,
    kind: 'query' | 'header',
    parameterId: string,
    patch: Partial<RouteSkillParameter>
  ) {
    updateSkillMetadata(skillId, (metadata) => ({
      ...metadata,
      ...(kind === 'query'
        ? {
            queryParameters: metadata.queryParameters.map((parameter) =>
              parameter.id === parameterId
                ? { ...parameter, ...patch }
                : parameter
            )
          }
        : {
            headerParameters: metadata.headerParameters.map((parameter) =>
              parameter.id === parameterId
                ? { ...parameter, ...patch }
                : parameter
            )
          })
    }))
  }

  function deleteParameter(
    skillId: string,
    kind: 'query' | 'header',
    parameterId: string
  ) {
    updateSkillMetadata(skillId, (metadata) => ({
      ...metadata,
      ...(kind === 'query'
        ? {
            queryParameters: metadata.queryParameters.filter(
              (parameter) => parameter.id !== parameterId
            )
          }
        : {
            headerParameters: metadata.headerParameters.filter(
              (parameter) => parameter.id !== parameterId
            )
          })
    }))
  }

  function toggleFolder(path: string) {
    setExpandedFolders((current) =>
      current.includes(path)
        ? current.filter((item) => item !== path)
        : [...current, path]
    )
  }

  function deleteFolder(folderPath: string | undefined) {
    if (!folderPath) {
      return
    }

    updateSkillAssets(({ skillEntries, skillFolders }) => ({
      skillEntries: skillEntries.filter(
        (skill) => !isPathWithinFolder(skill.path, folderPath)
      ),
      skillFolders: skillFolders.filter(
        (folder) => !isFolderWithinFolder(folder.path, folderPath)
      )
    }))
    setSelectedFolderPath(undefined)
  }

  function selectFolder(path: string) {
    setSelectedFolderPath(path)
    setSelectedSkillId(undefined)
  }

  function selectTreeNode(node: VisibleTreeNode) {
    if (node.kind === 'folder') {
      selectFolder(node.path)
      return
    }

    setSelectedFolderPath(undefined)
    setSelectedSkillId(node.skillId)
  }

  function focusTreeNode(nodeId: string | undefined) {
    if (!nodeId) {
      return
    }

    requestAnimationFrame(() => {
      treeApiRef.current?.focusItem(null, nodeId)
    })
  }

  function startTreeRename(node: VisibleTreeNode) {
    selectTreeNode(node)
    setTreeRenameTarget(
      node.kind === 'folder'
        ? {
            kind: 'folder',
            path: node.path,
            value: basename(node.path)
          }
        : {
            kind: 'skill',
            skillId: node.skillId ?? '',
            value: basename(node.path)
          }
    )
  }

  function cancelTreeRename() {
    setTreeRenameTarget(undefined)
  }

  function commitTreeRename() {
    if (!treeRenameTarget || treeRenameState.error) {
      return
    }

    if (treeRenameTarget.kind === 'skill') {
      const skill = client.skillEntries.find(
        (item) => item.id === treeRenameTarget.skillId
      )

      if (!skill) {
        cancelTreeRename()
        return
      }

      const nextLabel = normalizeEditableTreeLabel(treeRenameTarget.value)
      const nextPath = replacePathLeaf(skill.path, nextLabel)

      updateSkill(skill.id, (current) => ({
        ...current,
        path: nextPath
      }))
      setSelectedSkillId(skill.id)
      setSelectedFolderPath(undefined)
      cancelTreeRename()
      focusTreeNode(`skill:${skill.id}`)
      return
    }

    const nextLabel = normalizeEditableTreeLabel(treeRenameTarget.value)
    const nextFolderPath = replacePathLeaf(treeRenameTarget.path, nextLabel)

    updateSkillAssets(({ skillEntries, skillFolders }) => ({
      skillEntries: renameFolderSkills(
        skillEntries,
        treeRenameTarget.path,
        nextFolderPath
      ),
      skillFolders: renameFolderFolders(
        skillFolders,
        treeRenameTarget.path,
        nextFolderPath
      )
    }))
    setSelectedFolderPath(nextFolderPath)
    setExpandedFolders((current) => {
      const next = new Set(current)
      next.delete(treeRenameTarget.path)
      next.add(nextFolderPath)
      for (const path of listAncestorFolders(nextFolderPath)) {
        next.add(path)
      }
      return [...next]
    })
    cancelTreeRename()
    focusTreeNode(`folder:${nextFolderPath}`)
  }

  function handleTreeKeyDown(
    event: KeyboardEvent<HTMLElement>,
    node: VisibleTreeNode
  ) {
    if (treeRenameTarget) {
      return
    }

    if (event.key === 'F2') {
      event.preventDefault()
      startTreeRename(node)
    }
  }

  function handleExpandedItemsChange(
    _event: SyntheticEvent | null,
    itemIds: string[]
  ) {
    setExpandedFolders(
      itemIds
        .filter((itemId) => itemId.startsWith('folder:'))
        .map((itemId) => itemId.slice('folder:'.length))
    )
  }

  function handleSelectedItemsChange(
    _event: SyntheticEvent | null,
    itemId: string | null
  ) {
    if (!itemId) {
      return
    }

    if (itemId.startsWith('folder:')) {
      selectFolder(itemId.slice('folder:'.length))
      return
    }

    setSelectedFolderPath(undefined)
    setSelectedSkillId(itemId.slice('skill:'.length))
  }

  function openCreateMenu(event: MouseEvent<HTMLButtonElement>) {
    setCreateMenuAnchor(event.currentTarget)
  }

  function closeCreateMenu() {
    setCreateMenuAnchor(null)
  }

  return (
    <Stack
      spacing={1}
      sx={plainLayout ? { height: '100%', minHeight: 0 } : undefined}
    >
      {!hideHeader ? (
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t('options.assets.skills.title')}
        </Typography>
      ) : null}
      <Box
        sx={{
          display: hideTree ? 'block' : 'grid',
          ...(plainLayout ? { height: '100%', minHeight: 0 } : {}),
          gridTemplateColumns: hideTree
            ? undefined
            : 'minmax(180px, 260px) minmax(0, 1fr)',
          gap: 1.25,
          alignItems: 'start'
        }}
      >
        {!hideTree ? (
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'background.paper'
            }}
          >
            <Stack spacing={0} sx={{ height: '100%' }}>
              <Stack
                direction="row"
                spacing={0.75}
                sx={{
                  pl: 1,
                  pr: 1.5,
                  py: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <TextField
                  size="small"
                  placeholder={t('options.assets.skills.search')}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchOutlined fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: searchQuery ? (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={t('common.clear')}
                            size="small"
                            onClick={() => setSearchQuery('')}
                          >
                            <CloseOutlined fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : undefined
                    }
                  }}
                  sx={{ flex: 1 }}
                />
                <Tooltip title={t('options.assets.skills.create')}>
                  <IconButton
                    aria-label={t('options.assets.skills.create')}
                    onClick={openCreateMenu}
                    size="small"
                    sx={{
                      width: 40,
                      height: 40,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1.25,
                      flexShrink: 0
                    }}
                  >
                    <AddOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={createMenuAnchor}
                  open={Boolean(createMenuAnchor)}
                  onClose={closeCreateMenu}
                >
                  <MenuItem
                    onClick={() => {
                      closeCreateMenu()
                      addSkill()
                    }}
                  >
                    <ListItemIcon>
                      <DescriptionOutlined fontSize="small" />
                    </ListItemIcon>
                    {t('options.assets.addSkill')}
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      closeCreateMenu()
                      addFolder()
                    }}
                  >
                    <ListItemIcon>
                      <CreateNewFolderOutlined fontSize="small" />
                    </ListItemIcon>
                    {t('options.assets.skills.addFolder')}
                  </MenuItem>
                </Menu>
              </Stack>

              <Box sx={{ py: 0.5, pr: 1 }}>
                {filteredTree.length === 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ px: 1.25, py: 1.25 }}
                  >
                    {searchQuery.trim()
                      ? t('options.assets.skills.searchEmpty')
                      : t('options.assets.skills.empty')}
                  </Typography>
                ) : (
                  <SimpleTreeView
                    apiRef={treeApiRef}
                    expandedItems={expandedItemIds}
                    expansionTrigger="iconContainer"
                    onExpandedItemsChange={handleExpandedItemsChange}
                    onSelectedItemsChange={(_event, itemId) =>
                      handleSelectedItemsChange(_event, itemId as string | null)
                    }
                    selectedItems={selectedTreeItemId}
                    sx={{
                      px: 0.5,
                      '& .MuiTreeItem-content': {
                        minHeight: 32,
                        pr: 0.5,
                        borderRadius: 1
                      },
                      '& .MuiTreeItem-label': {
                        flex: 1,
                        minWidth: 0
                      }
                    }}
                  >
                    {filteredTree.map((node) => (
                      <SkillTreeNodeRow
                        key={node.id}
                        node={node}
                        onAddFolder={addFolder}
                        onAddSkill={addSkill}
                        onCancelRename={cancelTreeRename}
                        onCommitRename={commitTreeRename}
                        onDeleteFolder={deleteFolder}
                        onDeleteSkill={deleteSkill}
                        onRenameChange={(value) =>
                          setTreeRenameTarget((current) =>
                            current ? { ...current, value } : current
                          )
                        }
                        onStartRename={startTreeRename}
                        onTreeKeyDown={handleTreeKeyDown}
                        onToggleFolder={toggleFolder}
                        renameError={Boolean(treeRenameState.error)}
                        renameHelperText={treeRenameState.helperText}
                        renameTarget={treeRenameTarget}
                        selectedFolderPath={selectedFolderPath}
                        selectedSkillId={selectedSkill?.id}
                        t={t}
                      />
                    ))}
                  </SimpleTreeView>
                )}
              </Box>
            </Stack>
          </Box>
        ) : null}

        {selectedSkill ? (
          <Stack
            spacing={1.25}
            sx={{
              minWidth: 0,
              ...(plainLayout ? { height: '100%', minHeight: 0 } : {})
            }}
          >
            <Stack spacing={1}>
              <TextField
                fullWidth
                size="small"
                label={t('options.assets.skills.titleField')}
                value={selectedSkill.metadata.title}
                onChange={(event) =>
                  updateSkillMetadata(selectedSkill.id, (metadata) => ({
                    ...metadata,
                    title: event.target.value
                  }))
                }
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={t('options.assets.skills.advancedMode')}>
                          <IconButton
                            aria-label={t('options.assets.skills.advancedMode')}
                            edge="end"
                            onClick={() => setAdvancedModeOpen(true)}
                            size="small"
                          >
                            <TuneOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    )
                  }
                }}
              />
              <TextField
                fullWidth
                size="small"
                label={t('common.summary')}
                multiline
                minRows={3}
                maxRows={3}
                value={selectedSkill.metadata.summary}
                onChange={(event) =>
                  updateSkillMetadata(selectedSkill.id, (metadata) => ({
                    ...metadata,
                    summary: event.target.value
                  }))
                }
              />
            </Stack>

            <Stack
              spacing={0.75}
              sx={plainLayout ? { flex: 1, minHeight: 0 } : undefined}
            >
              <SkillParameterBriefs
                headerParameters={selectedSkill.metadata.headerParameters}
                queryParameters={selectedSkill.metadata.queryParameters}
              />
              {availableTokens.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {availableTokens.map((token) => (
                    <Tooltip
                      key={token.token}
                      title={
                        token.summary
                          ? `${token.summary} · ${t(
                              'options.assets.skills.insertVariable'
                            )}`
                          : t('options.assets.skills.insertVariable')
                      }
                    >
                      <Chip
                        clickable
                        label={token.token}
                        onClick={() =>
                          editorRef.current?.insertText(token.token)
                        }
                        size="small"
                        sx={{ fontFamily: 'monospace' }}
                        variant="outlined"
                      />
                    </Tooltip>
                  ))}
                </Box>
              ) : null}
              <Box sx={plainLayout ? { flex: 1, minHeight: 280 } : undefined}>
                <MonacoCodeEditor
                  ariaLabel={t('options.assets.skills.content')}
                  height={plainLayout ? '100%' : undefined}
                  language="markdown"
                  minHeight={plainLayout ? 280 : 520}
                  modelUri={`inmemory://modeldriveprotocol/chrome-extension/route-client/${client.id}/skill/${selectedSkill.id}.md`}
                  onChange={(value) =>
                    updateSkill(selectedSkill.id, (skill) => ({
                      ...skill,
                      content: value
                    }))
                  }
                  options={{
                    wordWrap: 'on',
                    wrappingIndent: 'indent'
                  }}
                  ref={editorRef}
                  value={selectedSkill.content}
                />
              </Box>
            </Stack>
            <SkillParametersDialog
              headerParameters={selectedSkill.metadata.headerParameters}
              onAddParameter={(kind) => addParameter(selectedSkill.id, kind)}
              onClose={() => setAdvancedModeOpen(false)}
              onDeleteParameter={(kind, parameterId) =>
                deleteParameter(selectedSkill.id, kind, parameterId)
              }
              onUpdateParameter={(kind, parameterId, patch) =>
                updateParameter(selectedSkill.id, kind, parameterId, patch)
              }
              open={advancedModeOpen}
              queryParameters={selectedSkill.metadata.queryParameters}
              skillTitle={selectedSkill.metadata.title}
            />
          </Stack>
        ) : selectedFolderPath ? (
          <Stack
            spacing={1.25}
            sx={{
              minWidth: 0,
              ...(plainLayout
                ? {}
                : {
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    px: 1.25,
                    py: 1.1
                  })
            }}
          >
            <Stack direction="row" spacing={0.75} justifyContent="flex-end">
              <ToolbarIcon
                label={t('options.assets.skills.addSkillInFolder')}
                onClick={() => addSkill(selectedFolderPath)}
              >
                <AddOutlined fontSize="small" />
              </ToolbarIcon>
            </Stack>

            <Typography variant="body2" color="text.secondary">
              {t('options.assets.skills.folderSummary', {
                count: selectedFolderSkills.length
              })}
            </Typography>

            {sortedSelectedFolderSkills.length > 0 ? (
              <Stack spacing={0}>
                {sortedSelectedFolderSkills.map((skill) => (
                  <ButtonBase
                    key={skill.id}
                    onClick={() => {
                      setSelectedFolderPath(undefined)
                      setSelectedSkillId(skill.id)
                    }}
                    sx={{
                      alignItems: 'stretch',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      justifyContent: 'flex-start',
                      px: 0,
                      py: 1,
                      textAlign: 'left',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    <Stack spacing={0.25} sx={{ minWidth: 0, width: '100%' }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600 }}
                        noWrap
                      >
                        {basename(skill.path)}.md
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                      >
                        {skill.path}
                      </Typography>
                    </Stack>
                  </ButtonBase>
                ))}
              </Stack>
            ) : null}
          </Stack>
        ) : (
          <Box
            sx={{
              px: 0,
              py: 1,
              minHeight: 360,
              display: 'grid',
              placeItems: 'center'
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {t('options.assets.skills.noSelection')}
            </Typography>
          </Box>
        )}
      </Box>
    </Stack>
  )
}

function SkillTreeNodeRow({
  node,
  onAddFolder,
  onAddSkill,
  onCancelRename,
  onCommitRename,
  onDeleteFolder,
  onDeleteSkill,
  onRenameChange,
  onStartRename,
  onTreeKeyDown,
  onToggleFolder,
  renameError,
  renameHelperText,
  renameTarget,
  selectedFolderPath,
  selectedSkillId,
  t
}: {
  node: SkillTreeNode
  onAddFolder: (folderPath: string) => void
  onAddSkill: (folderPath: string) => void
  onCancelRename: () => void
  onCommitRename: () => void
  onDeleteFolder: (folderPath: string) => void
  onDeleteSkill: (skillId: string) => void
  onRenameChange: (value: string) => void
  onStartRename: (node: VisibleTreeNode) => void
  onTreeKeyDown: (
    event: KeyboardEvent<HTMLElement>,
    node: VisibleTreeNode
  ) => void
  onToggleFolder: (path: string) => void
  renameError: boolean
  renameHelperText: string
  renameTarget: TreeRenameTarget | undefined
  selectedFolderPath: string | undefined
  selectedSkillId: string | undefined
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  const selected =
    node.kind === 'folder'
      ? selectedFolderPath === node.path
      : selectedSkillId === node.skillId
  const visibleNode: VisibleTreeNode =
    node.kind === 'folder'
      ? {
          kind: 'folder',
          id: `folder:${node.path}`,
          path: node.path,
          parentPath: dirname(node.path) || undefined
        }
      : {
          kind: 'skill',
          id: `skill:${node.skillId}`,
          path: node.path,
          parentPath: dirname(node.path) || undefined,
          skillId: node.skillId
        }
  const renaming =
    renameTarget?.kind === 'folder'
      ? node.kind === 'folder' && renameTarget.path === node.path
      : node.kind === 'skill' && renameTarget?.skillId === node.skillId

  return (
    <TreeItem
      itemId={visibleNode.id}
      label={
        <Box
          onDoubleClick={
            node.kind === 'folder'
              ? (event) => {
                  event.stopPropagation()
                  onToggleFolder(node.path)
                }
              : undefined
          }
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            minWidth: 0
          }}
        >
          {node.kind === 'folder' ? (
            <FolderOutlined fontSize="small" />
          ) : (
            <DescriptionOutlined fontSize="small" />
          )}
          {renaming && renameTarget ? (
            <TreeRenameField
              error={renameError}
              helperText={renameHelperText}
              onCancel={onCancelRename}
              onChange={onRenameChange}
              onCommit={onCommitRename}
              value={renameTarget.value}
            />
          ) : (
            <Typography
              variant="body2"
              noWrap
              sx={{
                minWidth: 0,
                flex: 1,
                fontWeight: node.kind === 'folder' ? 600 : 400
              }}
            >
              {node.kind === 'folder' ? node.label : `${node.label}.md`}
            </Typography>
          )}
          <Box
            className="skill-tree-actions"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.25,
              ml: 'auto',
              opacity: selected ? 1 : 0,
              pointerEvents: selected ? 'auto' : 'none',
              transition: 'opacity 120ms ease'
            }}
          >
            <TreeActionIcon
              label={t('options.assets.skills.renameItem')}
              onClick={(event) => {
                event.stopPropagation()
                onStartRename(visibleNode)
              }}
            >
              <EditOutlined fontSize="inherit" />
            </TreeActionIcon>
            {node.kind === 'folder' ? (
              <>
                <TreeActionIcon
                  label={t('options.assets.skills.addSkillInFolder')}
                  onClick={(event) => {
                    event.stopPropagation()
                    onAddSkill(node.path)
                  }}
                >
                  <AddOutlined fontSize="inherit" />
                </TreeActionIcon>
                <TreeActionIcon
                  label={t('options.assets.skills.addFolder')}
                  onClick={(event) => {
                    event.stopPropagation()
                    onAddFolder(node.path)
                  }}
                >
                  <CreateNewFolderOutlined fontSize="inherit" />
                </TreeActionIcon>
                <TreeActionIcon
                  label={t('options.assets.skills.deleteFolder')}
                  onClick={(event) => {
                    event.stopPropagation()
                    onDeleteFolder(node.path)
                  }}
                >
                  <DeleteOutlineOutlined fontSize="inherit" />
                </TreeActionIcon>
              </>
            ) : (
              <TreeActionIcon
                label={t('options.assets.deleteItem')}
                onClick={(event) => {
                  event.stopPropagation()
                  onDeleteSkill(node.skillId)
                }}
              >
                <DeleteOutlineOutlined fontSize="inherit" />
              </TreeActionIcon>
            )}
          </Box>
        </Box>
      }
      onKeyDown={(event) => onTreeKeyDown(event, visibleNode)}
      sx={{
        '& > .MuiTreeItem-content:hover .skill-tree-actions': {
          opacity: 1,
          pointerEvents: 'auto'
        }
      }}
    >
      {node.kind === 'folder'
        ? node.children.map((child) => (
            <SkillTreeNodeRow
              key={child.id}
              node={child}
              onAddFolder={onAddFolder}
              onAddSkill={onAddSkill}
              onCancelRename={onCancelRename}
              onCommitRename={onCommitRename}
              onDeleteFolder={onDeleteFolder}
              onDeleteSkill={onDeleteSkill}
              onRenameChange={onRenameChange}
              onStartRename={onStartRename}
              onTreeKeyDown={onTreeKeyDown}
              onToggleFolder={onToggleFolder}
              renameError={renameError}
              renameHelperText={renameHelperText}
              renameTarget={renameTarget}
              selectedFolderPath={selectedFolderPath}
              selectedSkillId={selectedSkillId}
              t={t}
            />
          ))
        : null}
    </TreeItem>
  )
}

function TreeRenameField({
  error,
  helperText,
  onCancel,
  onChange,
  onCommit,
  value
}: {
  error: boolean
  helperText: string
  onCancel: () => void
  onChange: (value: string) => void
  onCommit: () => void
  value: string
}) {
  return (
    <TextField
      autoFocus
      size="small"
      variant="standard"
      value={value}
      error={error}
      title={error ? helperText : undefined}
      onBlur={() => {
        if (error) {
          onCancel()
          return
        }

        onCommit()
      }}
      onChange={(event) => onChange(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation()

        if (event.key === 'Enter') {
          event.preventDefault()
          if (!error) {
            onCommit()
          }
        }

        if (event.key === 'Escape') {
          event.preventDefault()
          onCancel()
        }
      }}
      sx={{
        flex: 1,
        minWidth: 0,
        '& .MuiInputBase-root': {
          fontSize: 14
        }
      }}
    />
  )
}

function SkillParameterBriefs({
  headerParameters,
  queryParameters
}: {
  headerParameters: RouteSkillParameter[]
  queryParameters: RouteSkillParameter[]
}) {
  const { t } = useI18n()

  return (
    <Stack spacing={0.35} sx={{ minWidth: 0 }}>
      <SkillParameterBriefRow
        parameters={queryParameters}
        title={t('options.assets.skills.queryParameters')}
      />
      <SkillParameterBriefRow
        parameters={headerParameters}
        title={t('options.assets.skills.headerParameters')}
      />
    </Stack>
  )
}

function SkillParameterBriefRow({
  parameters,
  title
}: {
  parameters: RouteSkillParameter[]
  title: string
}) {
  const { t } = useI18n()

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 0.25, sm: 0.75 }}
      alignItems={{ xs: 'flex-start', sm: 'baseline' }}
      sx={{ minWidth: 0 }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ width: { sm: 88 }, flexShrink: 0 }}
      >
        {title}
      </Typography>
      {parameters.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('common.none')}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, minWidth: 0 }}>
          {parameters.map((parameter) => (
            <Chip
              key={parameter.id}
              label={formatSkillParameterBrief(parameter, t)}
              size="small"
              variant="outlined"
            />
          ))}
        </Box>
      )}
    </Stack>
  )
}

function TreeActionIcon({
  children,
  label,
  onClick
}: {
  children: ReactNode
  label: string
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <Tooltip title={label}>
      <IconButton
        size="small"
        aria-label={label}
        onClick={onClick}
        sx={{
          width: 22,
          height: 22,
          color: 'text.secondary',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          '&:hover': {
            bgcolor: 'action.hover'
          }
        }}
      >
        {children}
      </IconButton>
    </Tooltip>
  )
}

function getTreeRenameState(
  target: TreeRenameTarget | undefined,
  skills: RouteSkillEntry[],
  folders: RouteSkillFolder[],
  t: (key: string, values?: Record<string, string | number>) => string
): {
  error: boolean
  helperText: string
} {
  if (!target) {
    return {
      error: false,
      helperText: ''
    }
  }

  if (target.kind === 'skill') {
    const skill = skills.find((item) => item.id === target.skillId)

    if (!skill) {
      return {
        error: true,
        helperText: t('options.assets.skills.pathInvalid')
      }
    }

    return getSkillPathState(
      skill,
      skills,
      replacePathLeaf(skill.path, normalizeEditableTreeLabel(target.value)),
      t
    )
  }

  return getFolderPathState(
    target.path,
    skills,
    folders,
    replacePathLeaf(target.path, normalizeEditableTreeLabel(target.value)),
    t
  )
}

function buildSkillTokens(
  skill: RouteSkillEntry | undefined
): SkillTemplateToken[] {
  if (!skill) {
    return []
  }

  return [
    ...skill.metadata.queryParameters
      .map((parameter) => ({
        token: parameter.key.trim() ? `{{query.${parameter.key.trim()}}}` : '',
        summary: parameter.summary
      }))
      .filter((parameter) => Boolean(parameter.token)),
    ...skill.metadata.headerParameters
      .map((parameter) => ({
        token: parameter.key.trim() ? `{{header.${parameter.key.trim()}}}` : '',
        summary: parameter.summary
      }))
      .filter((parameter) => Boolean(parameter.token))
  ]
}

function formatSkillParameterBrief(
  parameter: RouteSkillParameter,
  t: (key: string, values?: Record<string, string | number>) => string
): string {
  const key = parameter.key.trim()

  if (!key) {
    return t(`options.assets.skills.parameterType.${parameter.type}`)
  }

  return `${key} · ${t(`options.assets.skills.parameterType.${parameter.type}`)}`
}

function getSkillPathState(
  skill: RouteSkillEntry | undefined,
  skills: RouteSkillEntry[],
  pathInput: string,
  t: (key: string, values?: Record<string, string | number>) => string
): {
  error: boolean
  helperText: string
} {
  const normalizedPath = normalizeEditableSkillPath(pathInput)

  if (!skill) {
    return {
      error: false,
      helperText: t('options.assets.skills.pathHint')
    }
  }

  if (!normalizedPath) {
    return {
      error: true,
      helperText: t('options.assets.skills.pathInvalid')
    }
  }

  const hasConflict = skills.some(
    (candidate) =>
      candidate.id !== skill.id &&
      normalizeEditableSkillPath(candidate.path) === normalizedPath
  )

  if (hasConflict) {
    return {
      error: true,
      helperText: t('options.assets.skills.pathConflict')
    }
  }

  return {
    error: false,
    helperText: t('options.assets.skills.pathHint')
  }
}

function hasSkillPathConflict(
  skill: RouteSkillEntry,
  skills: RouteSkillEntry[],
  nextPath: string
): boolean {
  return skills.some(
    (candidate) =>
      candidate.id !== skill.id &&
      normalizeEditableSkillPath(candidate.path) === nextPath
  )
}

function getFolderDraftState(
  skills: RouteSkillEntry[],
  folders: RouteSkillFolder[],
  folderDraftPath: string,
  t: (key: string, values?: Record<string, string | number>) => string
): {
  error: boolean
  helperText: string
} {
  const normalizedPath = normalizeEditableSkillPath(folderDraftPath)

  if (!folderDraftPath) {
    return {
      error: false,
      helperText: t('options.assets.skills.folderDraftHint')
    }
  }

  if (!normalizedPath) {
    return {
      error: true,
      helperText: t('options.assets.skills.folderPathInvalid')
    }
  }

  if (pathExistsAsFileOrFolder(skills, folders, normalizedPath)) {
    return {
      error: true,
      helperText: t('options.assets.skills.folderPathConflict')
    }
  }

  return {
    error: false,
    helperText: t('options.assets.skills.folderDraftHint')
  }
}

function getFolderPathState(
  folderPath: string | undefined,
  skills: RouteSkillEntry[],
  folders: RouteSkillFolder[],
  folderPathInput: string,
  t: (key: string, values?: Record<string, string | number>) => string
): {
  error: boolean
  helperText: string
} {
  const normalizedPath = normalizeEditableSkillPath(folderPathInput)

  if (!folderPath) {
    return {
      error: false,
      helperText: t('options.assets.skills.folderHint')
    }
  }

  if (!normalizedPath) {
    return {
      error: true,
      helperText: t('options.assets.skills.folderPathInvalid')
    }
  }

  if (
    normalizedPath !== normalizeEditableSkillPath(folderPath) &&
    pathExistsAsFileOrFolder(skills, folders, normalizedPath)
  ) {
    return {
      error: true,
      helperText: t('options.assets.skills.folderPathConflict')
    }
  }

  const nextSkills = renameFolderSkills(skills, folderPath, normalizedPath)
  const nextFolders = renameFolderFolders(folders, folderPath, normalizedPath)
  const nextPaths = nextSkills.map((skill) =>
    normalizeEditableSkillPath(skill.path)
  )
  const nextFolderPaths = nextFolders.map((folder) =>
    normalizeEditableSkillPath(folder.path)
  )

  if (
    new Set(nextPaths).size !== nextPaths.length ||
    new Set(nextFolderPaths).size !== nextFolderPaths.length
  ) {
    return {
      error: true,
      helperText: t('options.assets.skills.folderPathConflict')
    }
  }

  return {
    error: false,
    helperText: t('options.assets.skills.folderHint')
  }
}

export function buildSkillTree(
  skills: RouteSkillEntry[],
  folders: RouteSkillFolder[]
): SkillTreeNode[] {
  const root: SkillTreeNode[] = []
  const folderNodes = new Map<
    string,
    Extract<SkillTreeNode, { kind: 'folder' }>
  >()

  for (const folderPath of listTreeFolders(skills, folders)) {
    const segments = splitSkillPath(folderPath)

    if (segments.length === 0) {
      continue
    }

    let parentChildren = root
    let currentPath = ''

    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment

      let folder = folderNodes.get(currentPath)

      if (!folder) {
        folder = {
          kind: 'folder',
          id: `folder:${currentPath}`,
          path: currentPath,
          label: segment,
          children: []
        }
        folderNodes.set(currentPath, folder)
        parentChildren.push(folder)
      }

      parentChildren = folder.children
    }
  }

  for (const skill of [...skills].sort((left, right) =>
    left.path.localeCompare(right.path)
  )) {
    const segments = splitSkillPath(skill.path)

    if (segments.length === 0) {
      continue
    }

    let parentChildren = root
    let currentPath = ''

    for (const segment of segments.slice(0, -1)) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment

      let folder = folderNodes.get(currentPath)

      if (!folder) {
        folder = {
          kind: 'folder',
          id: `folder:${currentPath}`,
          path: currentPath,
          label: segment,
          children: []
        }
        folderNodes.set(currentPath, folder)
        parentChildren.push(folder)
      }

      parentChildren = folder.children
    }

    parentChildren.push({
      kind: 'skill',
      id: `skill:${skill.id}`,
      skillId: skill.id,
      path: skill.path,
      label: segments.at(-1) ?? skill.metadata.title ?? 'skill',
      searchText: [
        skill.path,
        skill.metadata.title,
        skill.metadata.summary,
        skill.content
      ]
        .filter(Boolean)
        .join(' ')
    })
  }

  return sortSkillTreeNodes(root)
}

export function filterSkillTree(
  nodes: SkillTreeNode[],
  searchQuery: string
): SkillTreeNode[] {
  const normalizedQuery = searchQuery.trim().toLowerCase()

  if (!normalizedQuery) {
    return nodes
  }

  return nodes.reduce<SkillTreeNode[]>((result, node) => {
    const matchesNode =
      node.kind === 'folder'
        ? `${node.path} ${node.label}`.toLowerCase().includes(normalizedQuery)
        : `${node.path} ${node.label} ${node.searchText}`
            .toLowerCase()
            .includes(normalizedQuery)

    if (node.kind === 'folder') {
      if (matchesNode) {
        result.push(node)
        return result
      }

      const filteredChildren = filterSkillTree(node.children, normalizedQuery)

      if (filteredChildren.length > 0) {
        result.push({ ...node, children: filteredChildren })
      }

      return result
    }

    if (matchesNode) {
      result.push(node)
    }

    return result
  }, [])
}

function listFolderPaths(nodes: SkillTreeNode[]): string[] {
  return nodes.flatMap((node) =>
    node.kind === 'folder'
      ? [node.path, ...listFolderPaths(node.children)]
      : []
  )
}

function flattenVisibleTreeNodes(
  nodes: SkillTreeNode[],
  expandedFolders: string[],
  parentPath?: string
): VisibleTreeNode[] {
  return nodes.flatMap((node) => {
    if (node.kind === 'folder') {
      return [
        {
          kind: 'folder' as const,
          id: `folder:${node.path}`,
          path: node.path,
          parentPath
        },
        ...(expandedFolders.includes(node.path)
          ? flattenVisibleTreeNodes(node.children, expandedFolders, node.path)
          : [])
      ]
    }

    return [
      {
        kind: 'skill' as const,
        id: `skill:${node.skillId}`,
        path: node.path,
        parentPath,
        skillId: node.skillId
      }
    ]
  })
}

function sortSkillTreeNodes(nodes: SkillTreeNode[]): SkillTreeNode[] {
  return [...nodes]
    .map((node) =>
      node.kind === 'folder'
        ? {
            ...node,
            children: sortSkillTreeNodes(node.children)
          }
        : node
    )
    .sort((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind === 'folder' ? -1 : 1
      }

      return left.label.localeCompare(right.label)
    })
}

function createUniqueSkillPath(
  existingPaths: string[],
  parentPath: string,
  baseName: string
): string {
  const normalizedParent = splitSkillPath(parentPath).join('/')
  const normalizedExistingPaths = existingPaths.map((path) =>
    splitSkillPath(path).join('/')
  )
  let attempt = 1

  while (true) {
    const suffix = attempt === 1 ? baseName : `${baseName}-${attempt}`
    const candidate = normalizedParent
      ? `${normalizedParent}/${suffix}`
      : suffix

    if (!normalizedExistingPaths.includes(candidate)) {
      return candidate
    }

    attempt += 1
  }
}

function createUniqueFolderPath(
  existingPaths: string[],
  folders: RouteSkillFolder[],
  parentPath: string,
  baseName: string
): string {
  const normalizedParent = normalizeEditableSkillPath(parentPath)
  const existingFolderPaths = new Set(
    listTreeFolders(
      existingPaths.map((path, index) => ({
        id: String(index),
        path,
        metadata: createDefaultSkillMetadata(''),
        content: ''
      })),
      folders
    )
  )
  let attempt = 1

  while (true) {
    const suffix = attempt === 1 ? baseName : `${baseName}-${attempt}`
    const candidate = normalizedParent
      ? `${normalizedParent}/${suffix}`
      : suffix

    if (!existingFolderPaths.has(candidate)) {
      return candidate
    }

    attempt += 1
  }
}

function listTreeFolders(
  skills: RouteSkillEntry[],
  folders: RouteSkillFolder[]
): string[] {
  return [
    ...new Set([
      ...skills.flatMap((skill) => listAncestorFolders(skill.path)),
      ...folders.flatMap((folder) => {
        const normalizedPath = normalizeEditableSkillPath(folder.path)
        return normalizedPath
          ? [...listAncestorFolders(normalizedPath), normalizedPath]
          : []
      })
    ])
  ]
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))
}

function pathExistsAsFileOrFolder(
  skills: RouteSkillEntry[],
  folders: RouteSkillFolder[],
  path: string
): boolean {
  const normalizedPath = normalizeEditableSkillPath(path)

  return (
    skills.some(
      (skill) => normalizeEditableSkillPath(skill.path) === normalizedPath
    ) || listTreeFolders(skills, folders).includes(normalizedPath)
  )
}

function isPathWithinFolder(path: string, folderPath: string): boolean {
  const normalizedPath = normalizeEditableSkillPath(path)
  const normalizedFolderPath = normalizeEditableSkillPath(folderPath)

  return normalizedPath.startsWith(`${normalizedFolderPath}/`)
}

function renameFolderSkills(
  skills: RouteSkillEntry[],
  fromFolderPath: string,
  toFolderPath: string
): RouteSkillEntry[] {
  const normalizedFrom = normalizeEditableSkillPath(fromFolderPath)
  const normalizedTo = normalizeEditableSkillPath(toFolderPath)

  return skills.map((skill) =>
    isPathWithinFolder(skill.path, normalizedFrom)
      ? {
          ...skill,
          path: `${normalizedTo}/${normalizeEditableSkillPath(skill.path).slice(
            normalizedFrom.length + 1
          )}`
        }
      : skill
  )
}

function renameFolderFolders(
  folders: RouteSkillFolder[],
  fromFolderPath: string,
  toFolderPath: string
): RouteSkillFolder[] {
  const normalizedFrom = normalizeEditableSkillPath(fromFolderPath)
  const normalizedTo = normalizeEditableSkillPath(toFolderPath)

  return folders.map((folder) => {
    const normalizedFolderPath = normalizeEditableSkillPath(folder.path)

    return isFolderWithinFolder(normalizedFolderPath, normalizedFrom)
      ? {
          ...folder,
          path:
            normalizedFolderPath === normalizedFrom
              ? normalizedTo
              : `${normalizedTo}/${normalizedFolderPath.slice(
                  normalizedFrom.length + 1
                )}`
        }
      : folder
  })
}

function isFolderWithinFolder(path: string, folderPath: string): boolean {
  const normalizedPath = normalizeEditableSkillPath(path)
  const normalizedFolderPath = normalizeEditableSkillPath(folderPath)

  return (
    normalizedPath === normalizedFolderPath ||
    normalizedPath.startsWith(`${normalizedFolderPath}/`)
  )
}

function cleanupSkillFolders(
  folders: RouteSkillFolder[],
  skills: RouteSkillEntry[]
): RouteSkillFolder[] {
  const skillPaths = new Set(
    skills.map((skill) => normalizeEditableSkillPath(skill.path))
  )
  const seenPaths = new Set<string>()

  return folders.filter((folder) => {
    const normalizedPath = normalizeEditableSkillPath(folder.path)

    if (
      !normalizedPath ||
      skillPaths.has(normalizedPath) ||
      seenPaths.has(normalizedPath)
    ) {
      return false
    }

    seenPaths.add(normalizedPath)
    return true
  })
}

function normalizeEditableSkillPath(path: string): string {
  return path
    .split('/')
    .map((segment) =>
      segment
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-_]+|[-_]+$/g, '')
    )
    .filter(Boolean)
    .join('/')
}

function splitSkillPath(path: string): string[] {
  return normalizeEditableSkillPath(path)
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function dirname(path: string): string {
  const segments = splitSkillPath(path)
  return segments.slice(0, -1).join('/')
}

function basename(path: string): string {
  const segments = splitSkillPath(path)
  return segments.at(-1) ?? ''
}

function replacePathLeaf(path: string, nextLeaf: string): string {
  const parentPath = dirname(path)
  return parentPath ? `${parentPath}/${nextLeaf}` : nextLeaf
}

function listAncestorFolders(path: string): string[] {
  const segments = splitSkillPath(path)
  const folders: string[] = []

  for (let index = 1; index < segments.length; index += 1) {
    folders.push(segments.slice(0, index).join('/'))
  }

  return folders
}

function folderPadding(path: string): number {
  const depth = normalizeEditableSkillPath(path)
    .split('/')
    .filter(Boolean).length
  return 1 + Math.max(depth - 1, 0) * 2
}

function normalizeEditableTreeLabel(value: string): string {
  const segments = splitSkillPath(value)
  return segments.at(-1) ?? ''
}
