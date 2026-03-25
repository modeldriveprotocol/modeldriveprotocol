import AddOutlined from '@mui/icons-material/AddOutlined'
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import CreateNewFolderOutlined from '@mui/icons-material/CreateNewFolderOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import FolderOutlined from '@mui/icons-material/FolderOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import {
  Box,
  ButtonBase,
  IconButton,
  InputAdornment,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view'
import type {
  DragEvent as ReactDragEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode
} from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import type {
  ExtensionConfig,
  RouteClientConfig,
  RouteClientRecording,
  RouteSkillEntry,
  RouteSkillFolder,
  RouteSkillMetadata,
  RouteSelectorResource
} from '#~/shared/config.js'
import type { OptionsAssetsTab } from '../../../platform/extension-api.js'
import { useI18n } from '../../../i18n/provider.js'
import { ToolbarIcon } from '../shared.js'
import { createLocalId } from '../types.js'
import {
  buildSkillTree,
  ClientSkillsPanel,
  filterSkillTree,
  type SkillTreeNode
} from './client-skills-panel.js'
import { ClientFlowsPanel } from './client-flows-panel.js'

type AssetTreeRoot = 'flows' | 'resources' | 'skills'
const DEFAULT_SKILL_MARKDOWN = '# Skill\n\nDescribe the workflow here.\n'
const ASSET_TREE_WIDTH_STORAGE_KEY = 'mdp-options-asset-tree-width'

function createDefaultSkillMetadata(title: string): RouteSkillMetadata {
  return {
    title,
    summary: '',
    queryParameters: [],
    headerParameters: []
  }
}

type AssetRenameTarget =
  | {
      kind: 'flow'
      id: string
      path: string
      value: string
    }
  | {
      kind: 'flow-folder'
      path: string
      value: string
    }
  | {
      kind: 'resource'
      id: string
      path: string
      value: string
    }
  | {
      kind: 'resource-folder'
      path: string
      value: string
    }
  | {
      kind: 'skill'
      skillId: string
      path: string
      value: string
    }
  | {
      kind: 'skill-folder'
      path: string
      value: string
    }

type AssetFileTreeNode =
  | {
      kind: 'folder'
      id: string
      path: string
      label: string
      children: AssetFileTreeNode[]
    }
  | {
      kind: 'file'
      id: string
      assetId: string
      path: string
      label: string
      searchText: string
    }

type AssetDragItem =
  | {
      root: 'flows'
      kind: 'file'
      id: string
      path: string
    }
  | {
      root: 'flows'
      kind: 'folder'
      path: string
    }
  | {
      root: 'resources'
      kind: 'file'
      id: string
      path: string
    }
  | {
      root: 'resources'
      kind: 'folder'
      path: string
    }
  | {
      root: 'skills'
      kind: 'file'
      id: string
      path: string
    }
  | {
      root: 'skills'
      kind: 'folder'
      path: string
    }

type AssetDropTarget = {
  root: AssetTreeRoot
  folderPath?: string
  itemId: string
}

type AssetScopeEntry = {
  itemId: string
  kind: 'folder' | 'file'
  title: string
  subtitle?: string
}

type AssetBreadcrumb = {
  itemId: string
  label: string
}

export function ClientAssetsPanel({
  client,
  draft,
  initialTab,
  onChange
}: {
  client: RouteClientConfig
  draft: ExtensionConfig
  initialTab: OptionsAssetsTab | undefined
  onChange: (config: ExtensionConfig) => void
}) {
  const { t } = useI18n()
  const [selectedItemId, setSelectedItemId] = useState<string>('root:flows')
  const [selectedResourceId, setSelectedResourceId] = useState<string>()
  const [expandedFlowFolders, setExpandedFlowFolders] = useState<string[]>([])
  const [expandedResourceFolders, setExpandedResourceFolders] = useState<
    string[]
  >([])
  const [expandedSkillFolders, setExpandedSkillFolders] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [createMenuAnchor, setCreateMenuAnchor] = useState<HTMLElement | null>(
    null
  )
  const [renameTarget, setRenameTarget] = useState<AssetRenameTarget>()
  const [skillCreateTargetPath, setSkillCreateTargetPath] = useState('')
  const [resourcePathInput, setResourcePathInput] = useState('')
  const [dragItem, setDragItem] = useState<AssetDragItem>()
  const [dropTargetItemId, setDropTargetItemId] = useState<string>()
  const [treeWidth, setTreeWidth] = useState(272)
  const [isResizingTree, setIsResizingTree] = useState(false)
  const layoutRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const dragExpandTimerRef = useRef<
    ReturnType<typeof globalThis.setTimeout> | undefined
  >(undefined)
  const dragExpandTargetRef = useRef<string | undefined>(undefined)

  function updateClient(next: RouteClientConfig) {
    onChange({
      ...draft,
      routeClients: draft.routeClients.map((item) =>
        item.id === next.id ? next : item
      )
    })
  }

  useEffect(() => {
    setSelectedItemId(`root:${initialTab ?? 'flows'}`)
  }, [client.id, initialTab])

  useEffect(() => {
    const savedWidth = Number(globalThis.localStorage?.getItem(ASSET_TREE_WIDTH_STORAGE_KEY))

    if (Number.isFinite(savedWidth) && savedWidth >= 180 && savedWidth <= 420) {
      setTreeWidth(savedWidth)
    }
  }, [])

  useEffect(() => {
    setSelectedResourceId((current) =>
      current &&
      client.selectorResources.some((resource) => resource.id === current)
        ? current
        : client.selectorResources[0]?.id
    )
  }, [client.id, client.selectorResources])

  const selectedRoot = getSelectedRoot(selectedItemId)
  const isResourceLeafSelected = selectedItemId.startsWith('resource:')
  const isFlowLeafSelected = selectedItemId.startsWith('flow:')
  const isSkillFileSelected = selectedItemId.startsWith('skill:')
  const isSkillFolderSelected = selectedItemId.startsWith('skill-folder:')
  const selectedFlowId = selectedItemId.startsWith('flow:')
    ? selectedItemId.slice('flow:'.length)
    : undefined
  const selectedFlowFolderPath = selectedItemId.startsWith('flow-folder:')
    ? selectedItemId.slice('flow-folder:'.length)
    : undefined
  const selectedResourceFolderPath = selectedItemId.startsWith('resource-folder:')
    ? selectedItemId.slice('resource-folder:'.length)
    : undefined
  const selectedSkillId = selectedItemId.startsWith('skill:')
    ? selectedItemId.slice('skill:'.length)
    : undefined
  const selectedSkillFolderPath = selectedItemId.startsWith('skill-folder:')
    ? selectedItemId.slice('skill-folder:'.length)
    : undefined
  const selectedFlow = selectedFlowId
    ? client.recordings.find((recording) => recording.id === selectedFlowId)
    : undefined
  const selectedResource =
    client.selectorResources.find(
      (resource) =>
        resource.id ===
        (selectedItemId.startsWith('resource:')
          ? selectedItemId.slice('resource:'.length)
          : selectedResourceId)
    ) ?? client.selectorResources[0]
  const flowTree = useMemo(
    () =>
      buildAssetFileTree(client.recordings, (recording) =>
        [recording.path, recording.name, recording.description]
          .filter(Boolean)
          .join(' ')
      ),
    [client.recordings]
  )
  const resourceTree = useMemo(
    () =>
      buildAssetFileTree(client.selectorResources, (resource) =>
        [
          resource.path,
          resource.name,
          resource.description,
          resource.selector,
          resource.text
        ]
          .filter(Boolean)
          .join(' ')
      ),
    [client.selectorResources]
  )
  const skillTree = useMemo(
    () => buildSkillTree(client.skillEntries, client.skillFolders),
    [client.skillEntries, client.skillFolders]
  )
  const selectedSkill = useMemo(
    () =>
      selectedSkillId
        ? client.skillEntries.find((skill) => skill.id === selectedSkillId)
        : undefined,
    [client.skillEntries, selectedSkillId]
  )
  const recordingsById = useMemo(
    () => new Map(client.recordings.map((recording) => [recording.id, recording])),
    [client.recordings]
  )
  const resourcesById = useMemo(
    () => new Map(client.selectorResources.map((resource) => [resource.id, resource])),
    [client.selectorResources]
  )
  const skillsById = useMemo(
    () => new Map(client.skillEntries.map((skill) => [skill.id, skill])),
    [client.skillEntries]
  )
  const filteredFlowTree = useMemo(
    () => filterAssetFileTree(flowTree, searchQuery),
    [flowTree, searchQuery]
  )
  const filteredResourceTree = useMemo(
    () => filterAssetFileTree(resourceTree, searchQuery),
    [resourceTree, searchQuery]
  )
  const filteredSkillTree = useMemo(
    () => filterSkillTree(skillTree, searchQuery),
    [searchQuery, skillTree]
  )
  const forcedExpandedFlowFolders = useMemo(
    () => (searchQuery.trim() ? collectAssetFolderPaths(filteredFlowTree) : []),
    [filteredFlowTree, searchQuery]
  )
  const forcedExpandedResourceFolders = useMemo(
    () =>
      searchQuery.trim() ? collectAssetFolderPaths(filteredResourceTree) : [],
    [filteredResourceTree, searchQuery]
  )
  const forcedExpandedSkillFolders = useMemo(
    () =>
      searchQuery.trim() ? collectSkillFolderPaths(filteredSkillTree) : [],
    [filteredSkillTree, searchQuery]
  )
  const visibleItemIds = useMemo(
    () =>
      new Set([
        'root:flows',
        'root:resources',
        'root:skills',
        ...collectAssetItemIds('flow', filteredFlowTree),
        ...collectAssetItemIds('resource', filteredResourceTree),
        ...collectSkillItemIds(filteredSkillTree)
      ]),
    [filteredFlowTree, filteredResourceTree, filteredSkillTree]
  )
  const hasSearchResults = visibleItemIds.size > 3
  const searchTerm = searchQuery.trim()
  const selectedTreeItemId = visibleItemIds.has(selectedItemId)
    ? selectedItemId
    : undefined
  const firstSearchResultItemId = useMemo(
    () =>
      searchTerm
        ? getFirstSearchResultItemId(
            selectedRoot,
            filteredFlowTree,
            filteredResourceTree,
            filteredSkillTree
          )
        : undefined,
    [filteredFlowTree, filteredResourceTree, filteredSkillTree, searchTerm, selectedRoot]
  )
  const renameError = useMemo(
    () => getAssetRenameError(renameTarget, client),
    [client, renameTarget]
  )
  const selectedResourcePathState = useMemo(
    () =>
      getResourcePathState(
        isResourceLeafSelected ? selectedResource : undefined,
        client.selectorResources,
        resourcePathInput,
        t
      ),
    [client.selectorResources, isResourceLeafSelected, resourcePathInput, selectedResource, t]
  )

  useEffect(() => {
    if (selectedFlow) {
      setExpandedFlowFolders((current) => [
        ...new Set([...current, ...listAncestorFolders(selectedFlow.path)])
      ])
    }
  }, [selectedFlow])

  useEffect(() => {
    if (selectedFlowFolderPath) {
      setExpandedFlowFolders((current) => [
        ...new Set([
          ...current,
          ...listAncestorFolders(selectedFlowFolderPath),
          selectedFlowFolderPath
        ])
      ])
    }
  }, [selectedFlowFolderPath])

  useEffect(() => {
    if (selectedResource && isResourceLeafSelected) {
      setExpandedResourceFolders((current) => [
        ...new Set([...current, ...listAncestorFolders(selectedResource.path)])
      ])
    }
  }, [isResourceLeafSelected, selectedResource])

  useEffect(() => {
    if (selectedResourceFolderPath) {
      setExpandedResourceFolders((current) => [
        ...new Set([
          ...current,
          ...listAncestorFolders(selectedResourceFolderPath),
          selectedResourceFolderPath
        ])
      ])
    }
  }, [selectedResourceFolderPath])

  useEffect(() => {
    if (selectedSkillId) {
      const selectedSkill = client.skillEntries.find(
        (skill) => skill.id === selectedSkillId
      )

      if (!selectedSkill) {
        setSelectedItemId('root:skills')
        return
      }

      setExpandedSkillFolders((current) => [
        ...new Set([...current, ...listAncestorFolders(selectedSkill.path)])
      ])
    }
  }, [client.skillEntries, selectedSkillId])

  useEffect(() => {
    if (selectedSkillFolderPath) {
      setExpandedSkillFolders((current) => [
        ...new Set([
          ...current,
          ...listAncestorFolders(selectedSkillFolderPath),
          selectedSkillFolderPath
        ])
      ])
    }
  }, [selectedSkillFolderPath])

  useEffect(() => {
    setResourcePathInput(selectedResource?.path ?? '')
  }, [selectedResource?.id, selectedResource?.path])

  const expandedItems = [
    'root:flows',
    'root:resources',
    'root:skills',
    ...[
      ...new Set([...expandedFlowFolders, ...forcedExpandedFlowFolders])
    ].map((path) => `flow-folder:${path}`),
    ...[
      ...new Set([
        ...expandedResourceFolders,
        ...forcedExpandedResourceFolders
      ])
    ].map((path) => `resource-folder:${path}`),
    ...[...new Set([...expandedSkillFolders, ...forcedExpandedSkillFolders])].map(
      (path) => `skill-folder:${path}`
    )
  ]

  useEffect(() => {
    if (visibleItemIds.has(selectedItemId)) {
      return
    }

    if (searchTerm) {
      return
    }

    setSelectedItemId(`root:${selectedRoot}`)
  }, [searchTerm, selectedItemId, selectedRoot, visibleItemIds])

  useEffect(() => {
    if (!isResizingTree) {
      return
    }

    function handlePointerMove(event: MouseEvent) {
      const rect = layoutRef.current?.getBoundingClientRect()

      if (!rect) {
        return
      }

      const nextWidth = Math.min(
        420,
        Math.max(180, Math.round(event.clientX - rect.left))
      )

      setTreeWidth(nextWidth)
    }

    function handlePointerUp() {
      setIsResizingTree(false)
    }

    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', handlePointerMove)
    window.addEventListener('mouseup', handlePointerUp)

    return () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      window.removeEventListener('mousemove', handlePointerMove)
      window.removeEventListener('mouseup', handlePointerUp)
    }
  }, [isResizingTree])

  useEffect(() => {
    globalThis.localStorage?.setItem(
      ASSET_TREE_WIDTH_STORAGE_KEY,
      String(treeWidth)
    )
  }, [treeWidth])

  useEffect(
    () => () => {
      if (dragExpandTimerRef.current) {
        globalThis.clearTimeout(dragExpandTimerRef.current)
      }
    },
    []
  )

  function selectAssetItem(itemId: string | null) {
    if (!itemId) {
      return
    }

    setSelectedItemId(itemId)

    if (itemId.startsWith('resource:')) {
        setSelectedResourceId(itemId.slice('resource:'.length))
    }
  }

  function handleTreeSelection(itemId: string | null) {
    selectAssetItem(itemId)
  }

  function handleSelectedFlowIdChange(flowId: string | undefined) {
    setSelectedItemId((current) => {
      const nextItemId = flowId ? `flow:${flowId}` : 'root:flows'
      return current === nextItemId ? current : nextItemId
    })
  }

  function handleExpandedItemsChange(itemIds: string[]) {
    setExpandedFlowFolders(
      itemIds
        .filter((itemId) => itemId.startsWith('flow-folder:'))
        .map((itemId) => itemId.slice('flow-folder:'.length))
    )
    setExpandedResourceFolders(
      itemIds
        .filter((itemId) => itemId.startsWith('resource-folder:'))
        .map((itemId) => itemId.slice('resource-folder:'.length))
    )
    setExpandedSkillFolders(
      itemIds
        .filter((itemId) => itemId.startsWith('skill-folder:'))
        .map((itemId) => itemId.slice('skill-folder:'.length))
    )
  }

  function startDragging(
    item: AssetDragItem,
    event: ReactDragEvent<HTMLElement>
  ) {
    event.dataTransfer.effectAllowed = 'move'
    setDragItem(item)
    setDropTargetItemId(undefined)
    cancelRename()
  }

  function finishDragging() {
    clearPendingDragExpand()
    setDragItem(undefined)
    setDropTargetItemId(undefined)
  }

  function clearPendingDragExpand() {
    if (dragExpandTimerRef.current) {
      globalThis.clearTimeout(dragExpandTimerRef.current)
      dragExpandTimerRef.current = undefined
    }

    dragExpandTargetRef.current = undefined
  }

  function scheduleDragExpand(target: AssetDropTarget) {
    if (!target.folderPath) {
      clearPendingDragExpand()
      return
    }

    const isExpanded =
      target.root === 'flows'
        ? expandedFlowFolders.includes(target.folderPath)
        : target.root === 'resources'
        ? expandedResourceFolders.includes(target.folderPath)
        : expandedSkillFolders.includes(target.folderPath)

    if (isExpanded) {
      clearPendingDragExpand()
      return
    }

    if (dragExpandTargetRef.current === target.itemId) {
      return
    }

    clearPendingDragExpand()
    dragExpandTargetRef.current = target.itemId
    dragExpandTimerRef.current = globalThis.setTimeout(() => {
      if (target.root === 'flows') {
        setExpandedFlowFolders((current) => [...new Set([...current, target.folderPath!])])
      } else if (target.root === 'resources') {
        setExpandedResourceFolders((current) => [
          ...new Set([...current, target.folderPath!])
        ])
      } else {
        setExpandedSkillFolders((current) => [
          ...new Set([...current, target.folderPath!])
        ])
      }

      clearPendingDragExpand()
    }, 420)
  }

  function handleDragOver(
    event: ReactDragEvent<HTMLElement>,
    target: AssetDropTarget
  ) {
    if (!dragItem || !canDropAssetItem(dragItem, target)) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    scheduleDragExpand(target)

    if (dropTargetItemId !== target.itemId) {
      setDropTargetItemId(target.itemId)
    }
  }

  function handleDrop(
    event: ReactDragEvent<HTMLElement>,
    target: AssetDropTarget
  ) {
    if (!dragItem || !canDropAssetItem(dragItem, target)) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    if (dragItem.root === 'flows') {
      if (dragItem.kind === 'file') {
        const nextPath = createUniqueAssetPath(
          client.recordings
            .filter((recording) => recording.id !== dragItem.id)
            .map((recording) => recording.path),
          target.folderPath ?? '',
          basename(dragItem.path)
        )

        if (nextPath !== normalizeEditableSkillPath(dragItem.path)) {
          updateClient({
            ...client,
            recordings: client.recordings.map((recording) =>
              recording.id === dragItem.id
                ? { ...recording, path: nextPath }
                : recording
            )
          })
          setExpandedFlowFolders((current) => [
            ...new Set([...current, ...listAncestorFolders(nextPath)])
          ])
        }
      } else {
        const nextFolderPath = createUniqueAssetFolderPath(
          client.recordings
            .filter(
              (recording) =>
                !isPathWithinFolder(recording.path, dragItem.path)
            )
            .map((recording) => recording.path),
          target.folderPath ?? '',
          basename(dragItem.path)
        )

        if (nextFolderPath !== normalizeEditableSkillPath(dragItem.path)) {
          updateClient({
            ...client,
            recordings: renameAssetFolderPaths(
              client.recordings,
              dragItem.path,
              nextFolderPath
            )
          })
          setExpandedFlowFolders((current) =>
            remapExpandedFolderPaths(current, dragItem.path, nextFolderPath)
          )
          setSelectedItemId((current) =>
            remapFolderSelectionItemId(
              current,
              'flow-folder',
              dragItem.path,
              nextFolderPath
            )
          )
        }
      }
    }

    if (dragItem.root === 'resources') {
      if (dragItem.kind === 'file') {
        const nextPath = createUniqueAssetPath(
          client.selectorResources
            .filter((resource) => resource.id !== dragItem.id)
            .map((resource) => resource.path),
          target.folderPath ?? '',
          basename(dragItem.path)
        )

        if (nextPath !== normalizeEditableSkillPath(dragItem.path)) {
          updateClient({
            ...client,
            selectorResources: client.selectorResources.map((resource) =>
              resource.id === dragItem.id
                ? { ...resource, path: nextPath }
                : resource
            )
          })
          setExpandedResourceFolders((current) => [
            ...new Set([...current, ...listAncestorFolders(nextPath)])
          ])
        }
      } else {
        const nextFolderPath = createUniqueAssetFolderPath(
          client.selectorResources
            .filter(
              (resource) => !isPathWithinFolder(resource.path, dragItem.path)
            )
            .map((resource) => resource.path),
          target.folderPath ?? '',
          basename(dragItem.path)
        )

        if (nextFolderPath !== normalizeEditableSkillPath(dragItem.path)) {
          updateClient({
            ...client,
            selectorResources: renameAssetFolderPaths(
              client.selectorResources,
              dragItem.path,
              nextFolderPath
            )
          })
          setExpandedResourceFolders((current) =>
            remapExpandedFolderPaths(current, dragItem.path, nextFolderPath)
          )
          setSelectedItemId((current) =>
            remapFolderSelectionItemId(
              current,
              'resource-folder',
              dragItem.path,
              nextFolderPath
            )
          )
        }
      }
    }

    if (dragItem.root === 'skills') {
      if (dragItem.kind === 'file') {
        const skill = client.skillEntries.find((entry) => entry.id === dragItem.id)

        if (skill) {
          const nextPath = createUniqueSkillPathInTree(
            client.skillEntries.filter((entry) => entry.id !== dragItem.id),
            client.skillFolders,
            target.folderPath ?? '',
            basename(skill.path)
          )

          if (nextPath !== normalizeEditableSkillPath(skill.path)) {
            updateClient({
              ...client,
              skillEntries: client.skillEntries.map((entry) =>
                entry.id === dragItem.id ? { ...entry, path: nextPath } : entry
              )
            })
            setExpandedSkillFolders((current) => [
              ...new Set([...current, ...listAncestorFolders(nextPath)])
            ])
          }
        }
      } else {
        const nextFolderPath = createUniqueSkillFolderMovePath(
          client.skillEntries,
          client.skillFolders,
          dragItem.path,
          target.folderPath ?? '',
          basename(dragItem.path)
        )

        if (nextFolderPath !== normalizeEditableSkillPath(dragItem.path)) {
          updateClient({
            ...client,
            skillEntries: renameFolderSkills(
              client.skillEntries,
              dragItem.path,
              nextFolderPath
            ),
            skillFolders: renameFolderFolders(
              client.skillFolders,
              dragItem.path,
              nextFolderPath
            )
          })
          setExpandedSkillFolders((current) =>
            remapExpandedFolderPaths(current, dragItem.path, nextFolderPath)
          )
          setSelectedItemId((current) =>
            remapFolderSelectionItemId(
              current,
              'skill-folder',
              dragItem.path,
              nextFolderPath
            )
          )
        }
      }
    }

    finishDragging()
  }

  function startRenameForSelection() {
    if (selectedItemId.startsWith('flow:')) {
      const flow = client.recordings.find(
        (recording) => recording.id === selectedItemId.slice('flow:'.length)
      )

      if (flow) {
        startRename(
          {
            kind: 'flow',
            id: flow.id,
            path: flow.path,
            value: basename(flow.path)
          },
          `flow:${flow.id}`
        )
      }

      return
    }

    if (selectedItemId.startsWith('flow-folder:')) {
      const folderPath = selectedItemId.slice('flow-folder:'.length)
      startRename(
        {
          kind: 'flow-folder',
          path: folderPath,
          value: basename(folderPath)
        },
        `flow-folder:${folderPath}`
      )
      return
    }

    if (selectedItemId.startsWith('resource:')) {
      const resource = client.selectorResources.find(
        (item) => item.id === selectedItemId.slice('resource:'.length)
      )

      if (resource) {
        startRename(
          {
            kind: 'resource',
            id: resource.id,
            path: resource.path,
            value: basename(resource.path)
          },
          `resource:${resource.id}`
        )
      }

      return
    }

    if (selectedItemId.startsWith('resource-folder:')) {
      const folderPath = selectedItemId.slice('resource-folder:'.length)
      startRename(
        {
          kind: 'resource-folder',
          path: folderPath,
          value: basename(folderPath)
        },
        `resource-folder:${folderPath}`
      )
      return
    }

    if (selectedItemId.startsWith('skill:')) {
      const skill = client.skillEntries.find(
        (entry) => entry.id === selectedItemId.slice('skill:'.length)
      )

      if (skill) {
        startRename(
          {
            kind: 'skill',
            skillId: skill.id,
            path: skill.path,
            value: basename(skill.path)
          },
          `skill:${skill.id}`
        )
      }

      return
    }

    if (selectedItemId.startsWith('skill-folder:')) {
      const folderPath = selectedItemId.slice('skill-folder:'.length)
      startRename(
        {
          kind: 'skill-folder',
          path: folderPath,
          value: basename(folderPath)
        },
        `skill-folder:${folderPath}`
      )
    }
  }

  function handlePanelKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === 'f'
    ) {
      event.preventDefault()
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
      return
    }

    if (isEditableKeyboardTarget(event.target)) {
      return
    }

    if (event.altKey && event.key === 'ArrowUp' && selectedParentItemId) {
      event.preventDefault()
      selectAssetItem(selectedParentItemId)
      return
    }

    if (event.key === 'F2') {
      event.preventDefault()
      startRenameForSelection()
    }
  }

  function startRename(target: AssetRenameTarget, itemId: string) {
    setSelectedItemId(itemId)
    setRenameTarget(target)
  }

  function cancelRename() {
    setRenameTarget(undefined)
  }

  function commitRename() {
    if (!renameTarget || renameError) {
      return
    }

    if (renameTarget.kind === 'flow') {
      const nextLeaf = normalizeEditableTreeLabel(renameTarget.value)
      const nextPath = replacePathLeaf(renameTarget.path, nextLeaf)

      updateClient({
        ...client,
        recordings: client.recordings.map((recording) =>
          recording.id === renameTarget.id
            ? { ...recording, path: nextPath }
            : recording
        )
      })
      setSelectedItemId(`flow:${renameTarget.id}`)
      cancelRename()
      return
    }

    if (renameTarget.kind === 'flow-folder') {
      const nextLeaf = normalizeEditableTreeLabel(renameTarget.value)
      const nextFolderPath = replacePathLeaf(renameTarget.path, nextLeaf)

      updateClient({
        ...client,
        recordings: renameAssetFolderPaths(
          client.recordings,
          renameTarget.path,
          nextFolderPath
        )
      })
      setExpandedFlowFolders((current) =>
        current.map((path) =>
          isFolderWithinFolder(path, renameTarget.path)
            ? path === renameTarget.path
              ? nextFolderPath
              : `${nextFolderPath}/${path.slice(renameTarget.path.length + 1)}`
            : path
        )
      )
      setSelectedItemId(`flow-folder:${nextFolderPath}`)
      cancelRename()
      return
    }

    if (renameTarget.kind === 'resource') {
      const nextLeaf = normalizeEditableTreeLabel(renameTarget.value)
      const nextPath = replacePathLeaf(renameTarget.path, nextLeaf)

      updateClient({
        ...client,
        selectorResources: client.selectorResources.map((resource) =>
          resource.id === renameTarget.id
            ? { ...resource, path: nextPath }
            : resource
        )
      })
      setSelectedItemId(`resource:${renameTarget.id}`)
      cancelRename()
      return
    }

    if (renameTarget.kind === 'resource-folder') {
      const nextLeaf = normalizeEditableTreeLabel(renameTarget.value)
      const nextFolderPath = replacePathLeaf(renameTarget.path, nextLeaf)

      updateClient({
        ...client,
        selectorResources: renameAssetFolderPaths(
          client.selectorResources,
          renameTarget.path,
          nextFolderPath
        )
      })
      setExpandedResourceFolders((current) =>
        current.map((path) =>
          isFolderWithinFolder(path, renameTarget.path)
            ? path === renameTarget.path
              ? nextFolderPath
              : `${nextFolderPath}/${path.slice(renameTarget.path.length + 1)}`
            : path
        )
      )
      setSelectedItemId(`resource-folder:${nextFolderPath}`)
      cancelRename()
      return
    }

    if (renameTarget.kind === 'skill') {
      const nextLeaf = normalizeEditableTreeLabel(renameTarget.value)
      const nextPath = replacePathLeaf(renameTarget.path, nextLeaf)

      updateClient({
        ...client,
        skillEntries: client.skillEntries.map((skill) =>
          skill.id === renameTarget.skillId ? { ...skill, path: nextPath } : skill
        )
      })
      cancelRename()
      return
    }

    const nextLeaf = normalizeEditableTreeLabel(renameTarget.value)
    const nextFolderPath = replacePathLeaf(renameTarget.path, nextLeaf)

    updateClient({
      ...client,
      skillEntries: renameFolderSkills(
        client.skillEntries,
        renameTarget.path,
        nextFolderPath
      ),
      skillFolders: renameFolderFolders(
        client.skillFolders,
        renameTarget.path,
        nextFolderPath
      )
    })
    setExpandedSkillFolders((current) =>
      current.map((path) =>
        isFolderWithinFolder(path, renameTarget.path)
          ? path === renameTarget.path
            ? nextFolderPath
            : `${nextFolderPath}/${path.slice(renameTarget.path.length + 1)}`
          : path
      )
    )
    setSelectedItemId(`skill-folder:${nextFolderPath}`)
    cancelRename()
  }

  function addResource(parentPath = selectedResourceParentPath) {
    const nextResource: RouteSelectorResource = {
      id: createLocalId('resource'),
      path: createUniqueAssetPath(
        client.selectorResources.map((resource) => resource.path),
        parentPath,
        'resource'
      ),
      name: t('options.assets.resources.newName'),
      description: '',
      createdAt: new Date().toISOString(),
      selector: '',
      alternativeSelectors: [],
      tagName: '',
      classes: [],
      attributes: {}
    }

    setSearchQuery('')
    updateClient({
      ...client,
      selectorResources: [...client.selectorResources, nextResource]
    })
    setSelectedResourceId(nextResource.id)
    setSelectedItemId(`resource:${nextResource.id}`)
  }

  function addFlow(parentPath = selectedFlowParentPath) {
    const now = new Date().toISOString()
    const nextFlow: RouteClientRecording = {
      id: createLocalId('flow'),
      path: createUniqueAssetPath(
        client.recordings.map((recording) => recording.path),
        parentPath,
        'flow'
      ),
      name: t('options.assets.flows.newName'),
      description: '',
      mode: 'script' as const,
      createdAt: now,
      updatedAt: now,
      capturedFeatures: [],
      steps: [],
      scriptSource:
        "// `args` contains the tool input object.\nconst selector = typeof args?.selector === 'string' ? args.selector : 'button';\nconst element = document.querySelector(selector);\n\nif (!(element instanceof HTMLElement)) {\n  throw new Error(`Element not found for selector: ${selector}`);\n}\n\nelement.click();\n\nreturn {\n  clicked: selector\n};\n"
    }

    setSearchQuery('')
    updateClient({
      ...client,
      recordings: [nextFlow, ...client.recordings]
    })
    setSelectedItemId(`flow:${nextFlow.id}`)
  }

  function deleteFlow(flowId: string) {
    updateClient({
      ...client,
      recordings: client.recordings.filter((recording) => recording.id !== flowId)
    })

    if (selectedItemId === `flow:${flowId}`) {
      setSelectedItemId('root:flows')
    }
  }

  function deleteFlowFolder(folderPath: string) {
    updateClient({
      ...client,
      recordings: client.recordings.filter(
        (recording) => !isPathWithinFolder(recording.path, folderPath)
      )
    })
    setExpandedFlowFolders((current) =>
      current.filter((path) => !isFolderWithinFolder(path, folderPath))
    )

    if (
      selectedItemId === `flow-folder:${folderPath}` ||
      (selectedItemId.startsWith('flow:') &&
        client.recordings.some(
          (recording) =>
            recording.id === selectedFlowId &&
            isPathWithinFolder(recording.path, folderPath)
        ))
    ) {
      setSelectedItemId('root:flows')
    }
  }

  function addSkill(parentPath = selectedSkillFolderPath ?? '') {
    setSearchQuery('')
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

    updateClient({
      ...client,
      skillEntries: [...client.skillEntries, nextSkill]
    })
    setExpandedSkillFolders((current) => [
      ...new Set([...current, ...listAncestorFolders(nextPath)])
    ])
    setSelectedItemId(`skill:${nextSkill.id}`)
  }

  function addSkillFolder(parentPath = selectedSkillFolderPath ?? '') {
    setSearchQuery('')
    const nextFolderPath = createUniqueFolderPath(
      client.skillEntries.map((skill) => skill.path),
      client.skillFolders,
      parentPath,
      'new-folder'
    )

    updateClient({
      ...client,
      skillFolders: [...client.skillFolders, { id: createLocalId('skill-folder'), path: nextFolderPath }]
    })
    setExpandedSkillFolders((current) => [
      ...new Set([
        ...current,
        ...listAncestorFolders(nextFolderPath),
        nextFolderPath
      ])
    ])
    setSelectedItemId(`skill-folder:${nextFolderPath}`)
  }

  function deleteResource(resourceId: string) {
    updateClient({
      ...client,
      selectorResources: client.selectorResources.filter(
        (resource) => resource.id !== resourceId
      )
    })

    if (selectedItemId === `resource:${resourceId}`) {
      setSelectedItemId('root:resources')
      setSelectedResourceId(undefined)
    }
  }

  function deleteResourceFolder(folderPath: string) {
    updateClient({
      ...client,
      selectorResources: client.selectorResources.filter(
        (resource) => !isPathWithinFolder(resource.path, folderPath)
      )
    })
    setExpandedResourceFolders((current) =>
      current.filter((path) => !isFolderWithinFolder(path, folderPath))
    )

    if (
      selectedItemId === `resource-folder:${folderPath}` ||
      (selectedItemId.startsWith('resource:') &&
        client.selectorResources.some(
          (resource) =>
            resource.id === selectedResourceId &&
            isPathWithinFolder(resource.path, folderPath)
        ))
    ) {
      setSelectedItemId('root:resources')
      setSelectedResourceId(undefined)
    }
  }

  function deleteSkill(skillId: string) {
    updateClient({
      ...client,
      skillEntries: client.skillEntries.filter((skill) => skill.id !== skillId)
    })

    if (selectedItemId === `skill:${skillId}`) {
      setSelectedItemId('root:skills')
    }
  }

  function deleteSkillFolder(folderPath: string) {
    updateClient({
      ...client,
      skillEntries: client.skillEntries.filter(
        (skill) => !isPathWithinFolder(skill.path, folderPath)
      ),
      skillFolders: client.skillFolders.filter(
        (folder) => !isFolderWithinFolder(folder.path, folderPath)
      )
    })
    setExpandedSkillFolders((current) =>
      current.filter((path) => !isFolderWithinFolder(path, folderPath))
    )

    if (
      selectedItemId === `skill-folder:${folderPath}` ||
      (selectedItemId.startsWith('skill:') &&
        client.skillEntries.some(
          (skill) =>
            skill.id === selectedSkillId &&
            isPathWithinFolder(skill.path, folderPath)
        ))
    ) {
      setSelectedItemId('root:skills')
    }
  }

  function openCreateMenu(
    event: ReactMouseEvent<HTMLButtonElement>,
    parentPath = ''
  ) {
    setSkillCreateTargetPath(parentPath)
    setCreateMenuAnchor(event.currentTarget)
  }

  function closeCreateMenu() {
    setSkillCreateTargetPath('')
    setCreateMenuAnchor(null)
  }

  const selectedFlowParentPath =
    selectedFlowFolderPath ?? (selectedFlow ? dirname(selectedFlow.path) : '')
  const selectedResourceParentPath =
    selectedResourceFolderPath ??
    (isResourceLeafSelected && selectedResource
      ? dirname(selectedResource.path)
      : '')
  const flowScopeEntries = useMemo(
    () =>
      buildFlowScopeEntries(
        getAssetFolderChildren(filteredFlowTree, selectedFlowFolderPath),
        recordingsById,
        t
      ),
    [filteredFlowTree, recordingsById, selectedFlowFolderPath, t]
  )
  const resourceScopeEntries = useMemo(
    () =>
      buildResourceScopeEntries(
        getAssetFolderChildren(filteredResourceTree, selectedResourceFolderPath),
        resourcesById,
        t
      ),
    [filteredResourceTree, resourcesById, selectedResourceFolderPath, t]
  )
  const flowRootLabel = t('options.assets.flows.title')
  const resourceRootLabel = t('options.assets.resources.title')
  const skillRootLabel = t('options.assets.skills.title')
  const openParentLabel = t('options.assets.openParentFolder')
  const skillScopeEntries = useMemo(
    () =>
      buildSkillScopeEntries(
        getSkillFolderChildren(filteredSkillTree, selectedSkillFolderPath),
        skillsById,
        t
      ),
    [filteredSkillTree, selectedSkillFolderPath, skillsById, t]
  )
  const flowLeafBreadcrumbs = useMemo(
    () =>
      selectedFlow
        ? buildAssetBreadcrumbs({
            folderItemPrefix: 'flow-folder',
            path: selectedFlow.path,
            rootItemId: 'root:flows',
            rootLabel: flowRootLabel
          })
        : undefined,
    [flowRootLabel, selectedFlow]
  )
  const flowScopeBreadcrumbs = useMemo(
    () =>
      buildAssetBreadcrumbs({
        folderItemPrefix: 'flow-folder',
        path: selectedFlowFolderPath,
        rootItemId: 'root:flows',
        rootLabel: flowRootLabel
      }),
    [flowRootLabel, selectedFlowFolderPath]
  )
  const flowParentScopeItemId = useMemo(
    () =>
      getParentScopeItemId({
        folderItemPrefix: 'flow-folder',
        path: selectedFlowFolderPath,
        rootItemId: 'root:flows'
      }),
    [selectedFlowFolderPath]
  )
  const flowParentItemId = useMemo(
    () =>
      isFlowLeafSelected && selectedFlow
        ? getParentScopeItemId({
            folderItemPrefix: 'flow-folder',
            path: selectedFlow.path,
            rootItemId: 'root:flows'
          })
        : flowParentScopeItemId,
    [flowParentScopeItemId, isFlowLeafSelected, selectedFlow]
  )
  const resourceLeafBreadcrumbs = useMemo(
    () =>
      selectedResource && isResourceLeafSelected
        ? buildAssetBreadcrumbs({
            folderItemPrefix: 'resource-folder',
            path: selectedResource.path,
            rootItemId: 'root:resources',
            rootLabel: resourceRootLabel
          })
        : undefined,
    [isResourceLeafSelected, resourceRootLabel, selectedResource]
  )
  const resourceScopeBreadcrumbs = useMemo(
    () =>
      buildAssetBreadcrumbs({
        folderItemPrefix: 'resource-folder',
        path: selectedResourceFolderPath,
        rootItemId: 'root:resources',
        rootLabel: resourceRootLabel
      }),
    [resourceRootLabel, selectedResourceFolderPath]
  )
  const resourceParentScopeItemId = useMemo(
    () =>
      getParentScopeItemId({
        folderItemPrefix: 'resource-folder',
        path: selectedResourceFolderPath,
        rootItemId: 'root:resources'
      }),
    [selectedResourceFolderPath]
  )
  const resourceParentItemId = useMemo(
    () =>
      isResourceLeafSelected && selectedResource
        ? getParentScopeItemId({
            folderItemPrefix: 'resource-folder',
            path: selectedResource.path,
            rootItemId: 'root:resources'
          })
        : resourceParentScopeItemId,
    [
      isResourceLeafSelected,
      resourceParentScopeItemId,
      selectedResource
    ]
  )
  const skillLeafBreadcrumbs = useMemo(
    () =>
      selectedSkill
        ? buildAssetBreadcrumbs({
            folderItemPrefix: 'skill-folder',
            path: selectedSkill.path,
            rootItemId: 'root:skills',
            rootLabel: skillRootLabel
          })
        : undefined,
    [selectedSkill, skillRootLabel]
  )
  const skillScopeBreadcrumbs = useMemo(
    () =>
      buildAssetBreadcrumbs({
        folderItemPrefix: 'skill-folder',
        path: selectedSkillFolderPath,
        rootItemId: 'root:skills',
        rootLabel: skillRootLabel
      }),
    [selectedSkillFolderPath, skillRootLabel]
  )
  const skillParentScopeItemId = useMemo(
    () =>
      getParentScopeItemId({
        folderItemPrefix: 'skill-folder',
        path: selectedSkillFolderPath,
        rootItemId: 'root:skills'
      }),
    [selectedSkillFolderPath]
  )
  const skillParentItemId = useMemo(
    () =>
      isSkillFileSelected && selectedSkill
        ? getParentScopeItemId({
            folderItemPrefix: 'skill-folder',
            path: selectedSkill.path,
            rootItemId: 'root:skills'
          })
        : skillParentScopeItemId,
    [isSkillFileSelected, selectedSkill, skillParentScopeItemId]
  )
  const selectedParentItemId =
    selectedRoot === 'flows'
      ? flowParentItemId
      : selectedRoot === 'resources'
      ? resourceParentItemId
      : skillParentItemId

  return (
    <Stack
      spacing={1}
      onKeyDownCapture={handlePanelKeyDown}
      sx={{ flex: 1, minHeight: 0 }}
    >
      <Box
        ref={layoutRef}
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: `${treeWidth}px 6px minmax(0, 1fr)`,
          gridTemplateRows: 'minmax(0, 1fr)',
          alignItems: 'stretch'
        }}
      >
        <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
          <Stack spacing={0} sx={{ height: '100%' }}>
            <Box
              sx={{
                pl: 0,
                pr: 1,
                py: 0.75,
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Stack direction="row" spacing={0.75}>
                <TextField
                  inputRef={searchInputRef}
                  size="small"
                  placeholder={t('options.assets.search')}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape' && searchQuery) {
                      event.preventDefault()
                      setSearchQuery('')
                      return
                    }

                    if (
                      firstSearchResultItemId &&
                      (event.key === 'ArrowDown' || event.key === 'Enter')
                    ) {
                      event.preventDefault()
                      selectAssetItem(firstSearchResultItemId)
                    }
                  }}
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
                  sx={{
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      minHeight: 34
                    },
                    '& .MuiOutlinedInput-input': {
                      py: 0.75
                    }
                  }}
                />
                <Menu
                  anchorEl={createMenuAnchor}
                  open={Boolean(createMenuAnchor)}
                  onClose={closeCreateMenu}
                >
                  <MenuItem
                    onClick={() => {
                      closeCreateMenu()
                      addSkill(skillCreateTargetPath)
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
                      addSkillFolder(skillCreateTargetPath)
                    }}
                  >
                    <ListItemIcon>
                      <CreateNewFolderOutlined fontSize="small" />
                    </ListItemIcon>
                    {t('options.assets.skills.addFolder')}
                  </MenuItem>
                </Menu>
              </Stack>
            </Box>

            <Box sx={{ py: 0.5, pr: 1 }}>
              {searchQuery.trim() && !hasSearchResults ? (
                <AssetEmptyState
                  label={t('options.assets.searchEmpty')}
                  minHeight={200}
                />
              ) : (
                <SimpleTreeView
                  expandedItems={expandedItems}
                  expansionTrigger="iconContainer"
                  onExpandedItemsChange={(_event, itemIds) =>
                    handleExpandedItemsChange(itemIds)
                  }
                  onSelectedItemsChange={(_event, itemId) =>
                    handleTreeSelection(itemId as string | null)
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
                    },
                    '& .asset-tree-actions': {
                      opacity: 0,
                      pointerEvents: 'none',
                      transition: 'opacity 120ms ease'
                    },
                    '& .MuiTreeItem-content:hover .asset-tree-actions, & .MuiTreeItem-content.Mui-selected .asset-tree-actions':
                      {
                        opacity: 1,
                        pointerEvents: 'auto'
                      }
                  }}
                >
                  <TreeItem
                    itemId="root:flows"
                    label={
                      <Box
                        onDragOver={(event) =>
                          handleDragOver(event, {
                            root: 'flows',
                            itemId: 'root:flows'
                          })
                        }
                        onDrop={(event) =>
                          handleDrop(event, {
                            root: 'flows',
                            itemId: 'root:flows'
                          })
                        }
                      >
                        <AssetTreeLabel
                          action={
                            <AssetTreeAction
                              label={t('options.assets.flows.addCode')}
                              onClick={() => addFlow('')}
                            >
                              <AddOutlined fontSize="inherit" />
                            </AssetTreeAction>
                          }
                          count={countAssetFiles(filteredFlowTree)}
                          dropActive={dropTargetItemId === 'root:flows'}
                          label={t('options.assets.flows.title')}
                          searchTerm={searchTerm}
                        />
                      </Box>
                    }
                  >
                    {filteredFlowTree.map((node) => (
                      <AssetFileTreeNodeItem
                        addLabel={t('options.assets.flows.addCode')}
                        dragItem={dragItem}
                        dropTargetItemId={dropTargetItemId}
                        fileItemPrefix="flow"
                        key={node.id}
                        node={node}
                        onAddFile={(parentPath) => addFlow(parentPath)}
                        onCancelRename={cancelRename}
                        onCommitRename={commitRename}
                        onDragEnd={finishDragging}
                        onDragOverFolder={(event, path) =>
                          handleDragOver(event, {
                            root: 'flows',
                            folderPath: path,
                            itemId: `flow-folder:${path}`
                          })
                        }
                        onDragStartFile={(event, id, path) =>
                          startDragging(
                            { root: 'flows', kind: 'file', id, path },
                            event
                          )
                        }
                        onDragStartFolder={(event, path) =>
                          startDragging(
                            { root: 'flows', kind: 'folder', path },
                            event
                          )
                        }
                        onDropFolder={(event, path) =>
                          handleDrop(event, {
                            root: 'flows',
                            folderPath: path,
                            itemId: `flow-folder:${path}`
                          })
                        }
                        onDeleteFile={deleteFlow}
                        onDeleteFolder={deleteFlowFolder}
                        onRenameChange={(value) =>
                          setRenameTarget((current) =>
                            current ? { ...current, value } : current
                          )
                        }
                        onSelectItem={selectAssetItem}
                        searchTerm={searchTerm}
                        onStartRename={startRename}
                        renameError={renameError}
                        renameTarget={renameTarget}
                        root="flows"
                        t={t}
                      />
                    ))}
                  </TreeItem>

                  <TreeItem
                    itemId="root:resources"
                    label={
                      <Box
                        onDragOver={(event) =>
                          handleDragOver(event, {
                            root: 'resources',
                            itemId: 'root:resources'
                          })
                        }
                        onDrop={(event) =>
                          handleDrop(event, {
                            root: 'resources',
                            itemId: 'root:resources'
                          })
                        }
                      >
                        <AssetTreeLabel
                          action={
                            <AssetTreeAction
                              label={t('options.assets.addResource')}
                              onClick={() => addResource('')}
                            >
                              <AddOutlined fontSize="inherit" />
                            </AssetTreeAction>
                          }
                          count={countAssetFiles(filteredResourceTree)}
                          dropActive={dropTargetItemId === 'root:resources'}
                          label={t('options.assets.resources.title')}
                          searchTerm={searchTerm}
                        />
                      </Box>
                    }
                  >
                    {filteredResourceTree.map((node) => (
                      <AssetFileTreeNodeItem
                        addLabel={t('options.assets.addResource')}
                        dragItem={dragItem}
                        dropTargetItemId={dropTargetItemId}
                        fileItemPrefix="resource"
                        key={node.id}
                        node={node}
                        onAddFile={(parentPath) => addResource(parentPath)}
                        onCancelRename={cancelRename}
                        onCommitRename={commitRename}
                        onDragEnd={finishDragging}
                        onDragOverFolder={(event, path) =>
                          handleDragOver(event, {
                            root: 'resources',
                            folderPath: path,
                            itemId: `resource-folder:${path}`
                          })
                        }
                        onDragStartFile={(event, id, path) =>
                          startDragging(
                            { root: 'resources', kind: 'file', id, path },
                            event
                          )
                        }
                        onDragStartFolder={(event, path) =>
                          startDragging(
                            { root: 'resources', kind: 'folder', path },
                            event
                          )
                        }
                        onDropFolder={(event, path) =>
                          handleDrop(event, {
                            root: 'resources',
                            folderPath: path,
                            itemId: `resource-folder:${path}`
                          })
                        }
                        onDeleteFile={deleteResource}
                        onDeleteFolder={deleteResourceFolder}
                        onRenameChange={(value) =>
                          setRenameTarget((current) =>
                            current ? { ...current, value } : current
                          )
                        }
                        onSelectItem={selectAssetItem}
                        searchTerm={searchTerm}
                        onStartRename={startRename}
                        renameError={renameError}
                        renameTarget={renameTarget}
                        root="resources"
                        t={t}
                      />
                    ))}
                  </TreeItem>

                  <TreeItem
                    itemId="root:skills"
                    label={
                      <Box
                        onDragOver={(event) =>
                          handleDragOver(event, {
                            root: 'skills',
                            itemId: 'root:skills'
                          })
                        }
                        onDrop={(event) =>
                          handleDrop(event, {
                            root: 'skills',
                            itemId: 'root:skills'
                          })
                        }
                      >
                        <AssetTreeLabel
                          action={
                            <AssetTreeAction
                              label={t('options.assets.skills.create')}
                              onClick={(event) => openCreateMenu(event, '')}
                            >
                              <AddOutlined fontSize="inherit" />
                            </AssetTreeAction>
                          }
                          count={countSkillLeaves(filteredSkillTree)}
                          dropActive={dropTargetItemId === 'root:skills'}
                          label={t('options.assets.skills.title')}
                          searchTerm={searchTerm}
                        />
                      </Box>
                    }
                  >
                    {filteredSkillTree.map((node) => (
                      <AssetSkillTreeNode
                        dragItem={dragItem}
                        dropTargetItemId={dropTargetItemId}
                        onDragEnd={finishDragging}
                        onDragOverFolder={(event, path) =>
                          handleDragOver(event, {
                            root: 'skills',
                            folderPath: path,
                            itemId: `skill-folder:${path}`
                          })
                        }
                        onDragStartFolder={(event, path) =>
                          startDragging(
                            { root: 'skills', kind: 'folder', path },
                            event
                          )
                        }
                        onDragStartSkill={(event, skillId, path) =>
                          startDragging(
                            { root: 'skills', kind: 'file', id: skillId, path },
                            event
                          )
                        }
                        onDropFolder={(event, path) =>
                          handleDrop(event, {
                            root: 'skills',
                            folderPath: path,
                            itemId: `skill-folder:${path}`
                          })
                        }
                        onCancelRename={cancelRename}
                        onCommitRename={commitRename}
                        key={node.id}
                        node={node}
                        onAddFolder={(event, path) => openCreateMenu(event, path)}
                        onDeleteFolder={deleteSkillFolder}
                        onDeleteSkill={deleteSkill}
                        onRenameChange={(value) =>
                          setRenameTarget((current) =>
                            current ? { ...current, value } : current
                          )
                        }
                        onSelectItem={selectAssetItem}
                        searchTerm={searchTerm}
                        onStartRename={startRename}
                        renameError={renameError}
                        renameTarget={renameTarget}
                        t={t}
                      />
                    ))}
                  </TreeItem>
                </SimpleTreeView>
              )}
            </Box>
          </Stack>
        </Box>

        <Box
          aria-hidden
          onDoubleClick={() => setTreeWidth(272)}
          onMouseDown={(event) => {
            event.preventDefault()
            setIsResizingTree(true)
          }}
          sx={{
            cursor: 'col-resize',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '50%',
              width: 1,
              transform: 'translateX(-50%)',
              bgcolor: isResizingTree ? 'text.primary' : 'divider'
            },
            '&:hover::before': {
              bgcolor: 'text.primary'
            }
          }}
        />

        <Box
          sx={{
            minWidth: 0,
            minHeight: 0,
            pl: 1.5,
            display: 'flex',
            flexDirection: 'column'
          }}
        >

        {selectedRoot === 'flows' && isFlowLeafSelected ? (
          <Stack spacing={1.25} sx={{ minWidth: 0 }}>
            <ClientFlowsPanel
              allowEmptySelection
              client={client}
              hideHeader
              hideList
              onChange={updateClient}
              onSelectedFlowIdChange={handleSelectedFlowIdChange}
              selectedFlowId={selectedFlowId}
            />
          </Stack>
        ) : null}

        {selectedRoot === 'flows' && !isFlowLeafSelected ? (
          <AssetScopePanel
            breadcrumbs={flowScopeBreadcrumbs}
            emptyLabel={t('options.assets.flows.empty')}
            entries={flowScopeEntries}
            onOpenItem={selectAssetItem}
            openParentLabel={openParentLabel}
            parentItemId={flowParentScopeItemId}
            path={selectedFlowFolderPath}
            searchTerm={searchTerm}
            title={
              selectedFlowFolderPath
                ? basename(selectedFlowFolderPath)
                : flowRootLabel
            }
          />
        ) : null}

        {selectedRoot === 'resources' ? (
          <Stack spacing={1.25} sx={{ minWidth: 0 }}>
            {!isResourceLeafSelected ? (
              <AssetContextHeader
                breadcrumbs={resourceScopeBreadcrumbs}
                onOpenItem={selectAssetItem}
                title={
                  selectedResourceFolderPath
                    ? basename(selectedResourceFolderPath)
                    : resourceRootLabel
                }
              />
            ) : null}

            {isResourceLeafSelected && selectedResource ? (
              <>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      md: 'repeat(2, minmax(0, 1fr))'
                    },
                    gap: 1,
                    alignItems: 'start'
                  }}
                >
                  <TextField
                    size="small"
                    label={t('options.assets.resources.name')}
                    value={selectedResource.name}
                    onChange={(event) =>
                      updateClient({
                        ...client,
                        selectorResources: client.selectorResources.map((item) =>
                          item.id === selectedResource.id
                            ? { ...item, name: event.target.value }
                            : item
                        )
                      })
                    }
                  />
                  <TextField
                    error={selectedResourcePathState.error}
                    helperText={
                      selectedResourcePathState.error
                        ? selectedResourcePathState.helperText
                        : undefined
                    }
                    size="small"
                    label={t('options.assets.path')}
                    value={resourcePathInput}
                    onBlur={() => {
                      const nextPath = normalizeEditableSkillPath(resourcePathInput)

                      setResourcePathInput(nextPath || selectedResource.path)

                      if (!nextPath || nextPath === selectedResource.path) {
                        return
                      }

                      if (selectedResourcePathState.error) {
                        return
                      }

                      updateClient({
                        ...client,
                        selectorResources: client.selectorResources.map((item) =>
                          item.id === selectedResource.id
                            ? { ...item, path: nextPath }
                            : item
                        )
                      })
                    }}
                    onChange={(event) => setResourcePathInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        const nextPath = normalizeEditableSkillPath(resourcePathInput)

                        setResourcePathInput(nextPath || selectedResource.path)

                        if (!nextPath || nextPath === selectedResource.path) {
                          return
                        }

                        if (selectedResourcePathState.error) {
                          return
                        }

                        updateClient({
                          ...client,
                          selectorResources: client.selectorResources.map((item) =>
                            item.id === selectedResource.id
                              ? { ...item, path: nextPath }
                              : item
                          )
                        })
                      }
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      md: 'repeat(2, minmax(0, 1fr))'
                    },
                    gap: 1
                  }}
                >
                  <TextField
                    size="small"
                    label={t('options.assets.resources.selector')}
                    value={selectedResource.selector}
                    onChange={(event) =>
                      updateClient({
                        ...client,
                        selectorResources: client.selectorResources.map((item) =>
                          item.id === selectedResource.id
                            ? { ...item, selector: event.target.value }
                            : item
                        )
                      })
                    }
                  />
                  <TextField
                    size="small"
                    label={t('options.assets.resources.tagName')}
                    value={selectedResource.tagName}
                    onChange={(event) =>
                      updateClient({
                        ...client,
                        selectorResources: client.selectorResources.map((item) =>
                          item.id === selectedResource.id
                            ? { ...item, tagName: event.target.value }
                            : item
                        )
                      })
                    }
                  />
                </Box>

                <TextField
                  size="small"
                  label={t('common.description')}
                  value={selectedResource.description}
                  onChange={(event) =>
                    updateClient({
                      ...client,
                      selectorResources: client.selectorResources.map((item) =>
                        item.id === selectedResource.id
                          ? { ...item, description: event.target.value }
                          : item
                      )
                    })
                  }
                />

                <TextField
                  size="small"
                  label={t('options.assets.resources.text')}
                  value={selectedResource.text ?? ''}
                  onChange={(event) =>
                    updateClient({
                      ...client,
                      selectorResources: client.selectorResources.map((item) =>
                        item.id === selectedResource.id
                          ? { ...item, text: event.target.value || undefined }
                          : item
                      )
                    })
                  }
                />

                <TextField
                  size="small"
                  label={t('options.assets.resources.alternativeSelectors')}
                  minRows={3}
                  multiline
                  value={selectedResource.alternativeSelectors.join('\n')}
                  onChange={(event) =>
                    updateClient({
                      ...client,
                      selectorResources: client.selectorResources.map((item) =>
                        item.id === selectedResource.id
                          ? {
                              ...item,
                              alternativeSelectors: event.target.value
                                .split(/\r?\n/g)
                                .map((value) => value.trim())
                                .filter(Boolean)
                            }
                          : item
                      )
                    })
                  }
                />

                <TextField
                  size="small"
                  label={t('options.assets.resources.classes')}
                  value={selectedResource.classes.join(', ')}
                  onChange={(event) =>
                    updateClient({
                      ...client,
                      selectorResources: client.selectorResources.map((item) =>
                        item.id === selectedResource.id
                          ? {
                              ...item,
                              classes: event.target.value
                                .split(',')
                                .map((value) => value.trim())
                                .filter(Boolean)
                            }
                          : item
                      )
                    })
                  }
                />
              </>
            ) : (
              <AssetScopePanel
                breadcrumbs={resourceScopeBreadcrumbs}
                emptyLabel={t('options.assets.resources.empty')}
                entries={resourceScopeEntries}
                onOpenItem={selectAssetItem}
                openParentLabel={openParentLabel}
                parentItemId={resourceParentScopeItemId}
                path={selectedResourceFolderPath}
                searchTerm={searchTerm}
                title={
                  selectedResourceFolderPath
                    ? basename(selectedResourceFolderPath)
                    : resourceRootLabel
                }
              />
            )}
          </Stack>
        ) : null}

        {selectedRoot === 'skills' && isSkillFileSelected ? (
          <Stack spacing={1.25} sx={{ minWidth: 0, flex: 1, minHeight: 0 }}>
            <ClientSkillsPanel
              client={client}
              hideHeader
              hideTree
              onChange={updateClient}
              onSelectionChange={({ folderPath, skillId }) =>
                setSelectedItemId(
                  folderPath
                    ? `skill-folder:${folderPath}`
                    : skillId
                    ? `skill:${skillId}`
                    : 'root:skills'
                )
              }
              selectedSkillId={selectedSkillId}
            />
          </Stack>
        ) : null}

        {selectedRoot === 'skills' && !isSkillFileSelected ? (
          <AssetScopePanel
            breadcrumbs={skillScopeBreadcrumbs}
            emptyLabel={t('options.assets.skills.empty')}
            entries={skillScopeEntries}
            onOpenItem={selectAssetItem}
            openParentLabel={openParentLabel}
            parentItemId={skillParentScopeItemId}
            path={selectedSkillFolderPath}
            searchTerm={searchTerm}
            title={
              isSkillFolderSelected && selectedSkillFolderPath
                ? basename(selectedSkillFolderPath)
                : skillRootLabel
            }
          />
        ) : null}
      </Box>
      </Box>
    </Stack>
  )
}

function AssetTreeLabel({
  action,
  count,
  dropActive = false,
  label,
  searchTerm
}: {
  action?: ReactNode
  count: number
  dropActive?: boolean
  label: string
  searchTerm?: string
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        minWidth: 0,
        bgcolor: dropActive ? 'action.hover' : undefined
      }}
    >
      <FolderOutlined fontSize="small" />
      <Typography variant="body2" noWrap sx={{ flex: 1, fontWeight: 600 }}>
        {renderHighlightedText(label, searchTerm)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {count}
      </Typography>
      {action ? <Box className="asset-tree-actions">{action}</Box> : null}
    </Box>
  )
}

function AssetTreeLeaf({
  action,
  dragging = false,
  dropActive = false,
  icon,
  label
}: {
  action?: ReactNode
  dragging?: boolean
  dropActive?: boolean
  icon: ReactNode
  label: ReactNode
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        minWidth: 0,
        opacity: dragging ? 0.45 : 1,
        bgcolor: dropActive ? 'action.hover' : undefined
      }}
    >
      {icon}
      <Box sx={{ flex: 1, minWidth: 0 }}>{label}</Box>
      {action ? <Box className="asset-tree-actions">{action}</Box> : null}
    </Box>
  )
}

function AssetTreeAction({
  children,
  label,
  onClick
}: {
  children: ReactNode
  label: string
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <Tooltip title={label}>
      <IconButton
        aria-label={label}
        size="small"
        onClick={(event) => {
          event.stopPropagation()
          onClick(event)
        }}
        sx={{
          width: 20,
          height: 20,
          color: 'text.secondary'
        }}
      >
        {children}
      </IconButton>
    </Tooltip>
  )
}

function AssetTreeRenameField({
  error,
  onCancel,
  onChange,
  onCommit,
  value
}: {
  error: boolean
  onCancel: () => void
  onChange: (value: string) => void
  onCommit: () => void
  value: string
}) {
  return (
    <TextField
      autoFocus
      error={error}
      size="small"
      variant="standard"
      value={value}
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
        '& .MuiInputBase-root': {
          fontSize: 14
        },
        minWidth: 0
      }}
    />
  )
}

function AssetContextHeader({
  breadcrumbs,
  onOpenItem,
  path,
  title
}: {
  breadcrumbs?: AssetBreadcrumb[]
  onOpenItem?: (itemId: string) => void
  path?: string
  title: string
}) {
  return (
    <Stack spacing={0.25} sx={{ pb: 1 }}>
      <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 0.5,
            minWidth: 0
          }}
        >
          {breadcrumbs.map((breadcrumb, index) => (
            <Box
              key={breadcrumb.itemId}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                minWidth: 0
              }}
            >
              {index > 0 ? (
                <Typography variant="caption" color="text.secondary">
                  /
                </Typography>
              ) : null}
              {onOpenItem ? (
                <ButtonBase
                  onClick={() => onOpenItem(breadcrumb.itemId)}
                  sx={{
                    minWidth: 0,
                    color: 'text.secondary',
                    justifyContent: 'flex-start',
                    borderRadius: 0.5,
                    px: 0.25
                  }}
                >
                  <Typography variant="caption" noWrap>
                    {breadcrumb.label}
                  </Typography>
                </ButtonBase>
              ) : (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {breadcrumb.label}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      ) : path ? (
        <Typography variant="caption" color="text.secondary" noWrap>
          {path}
        </Typography>
      ) : null}
    </Stack>
  )
}

function AssetFileTreeNodeItem({
  addLabel,
  dragItem,
  dropTargetItemId,
  fileItemPrefix,
  onDragEnd,
  onDragOverFolder,
  onDragStartFolder,
  onDragStartFile,
  onDropFolder,
  node,
  onAddFile,
  onCancelRename,
  onCommitRename,
  onDeleteFile,
  onDeleteFolder,
  onRenameChange,
  onSelectItem,
  searchTerm,
  onStartRename,
  renameError,
  renameTarget,
  root,
  t
}: {
  addLabel: string
  dragItem: AssetDragItem | undefined
  dropTargetItemId: string | undefined
  fileItemPrefix: 'flow' | 'resource'
  onDragEnd: () => void
  onDragOverFolder: (
    event: ReactDragEvent<HTMLElement>,
    path: string
  ) => void
  onDragStartFolder: (
    event: ReactDragEvent<HTMLElement>,
    path: string
  ) => void
  onDragStartFile: (
    event: ReactDragEvent<HTMLElement>,
    id: string,
    path: string
  ) => void
  onDropFolder: (event: ReactDragEvent<HTMLElement>, path: string) => void
  node: AssetFileTreeNode
  onAddFile: (parentPath: string) => void
  onCancelRename: () => void
  onCommitRename: () => void
  onDeleteFile: (assetId: string) => void
  onDeleteFolder: (path: string) => void
  onRenameChange: (value: string) => void
  onSelectItem: (itemId: string) => void
  searchTerm?: string
  onStartRename: (target: AssetRenameTarget, itemId: string) => void
  renameError: boolean
  renameTarget: AssetRenameTarget | undefined
  root: 'flows' | 'resources'
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  const folderRenameKind =
    root === 'flows' ? 'flow-folder' : 'resource-folder'
  const fileRenameKind = root === 'flows' ? 'flow' : 'resource'

  return node.kind === 'folder' ? (
    <TreeItem
      itemId={`${fileItemPrefix}-folder:${node.path}`}
      label={
        <Box
          draggable
          onClick={() => onSelectItem(`${fileItemPrefix}-folder:${node.path}`)}
          onDragEnd={onDragEnd}
          onDragOver={(event) => onDragOverFolder(event, node.path)}
          onDragStart={(event) => onDragStartFolder(event, node.path)}
          onDrop={(event) => onDropFolder(event, node.path)}
        >
          <AssetTreeLeaf
            action={
              <Stack direction="row" spacing={0.25}>
                <AssetTreeAction
                  label={t('options.assets.renameItem')}
                  onClick={() =>
                    onStartRename(
                      {
                        kind: folderRenameKind,
                        path: node.path,
                        value: node.label
                      } as AssetRenameTarget,
                      `${fileItemPrefix}-folder:${node.path}`
                    )
                  }
                >
                  <EditOutlined fontSize="inherit" />
                </AssetTreeAction>
                <AssetTreeAction
                  label={addLabel}
                  onClick={() => onAddFile(node.path)}
                >
                  <AddOutlined fontSize="inherit" />
                </AssetTreeAction>
                <AssetTreeAction
                  label={t('options.assets.deleteFolder')}
                  onClick={() => onDeleteFolder(node.path)}
                >
                  <DeleteOutlineOutlined fontSize="inherit" />
                </AssetTreeAction>
              </Stack>
            }
            dragging={
              dragItem?.kind === 'folder' &&
              dragItem.root === root &&
              dragItem.path === node.path
            }
            dropActive={dropTargetItemId === `${fileItemPrefix}-folder:${node.path}`}
            icon={<FolderOutlined fontSize="small" />}
            label={
              renameTarget?.kind === folderRenameKind &&
              renameTarget.path === node.path ? (
                <AssetTreeRenameField
                  error={renameError}
                  onCancel={onCancelRename}
                  onChange={onRenameChange}
                  onCommit={onCommitRename}
                  value={renameTarget.value}
                />
              ) : (
                <Typography variant="body2" noWrap>
                  {renderHighlightedText(node.label, searchTerm)}
                </Typography>
              )
            }
          />
        </Box>
      }
    >
      {node.children.map((child) => (
        <AssetFileTreeNodeItem
          addLabel={addLabel}
          dragItem={dragItem}
          dropTargetItemId={dropTargetItemId}
          fileItemPrefix={fileItemPrefix}
          key={child.id}
          onDragEnd={onDragEnd}
          onDragOverFolder={onDragOverFolder}
          onDragStartFile={onDragStartFile}
          onDragStartFolder={onDragStartFolder}
          onDropFolder={onDropFolder}
          node={child}
          onAddFile={onAddFile}
          onCancelRename={onCancelRename}
          onCommitRename={onCommitRename}
          onDeleteFile={onDeleteFile}
          onDeleteFolder={onDeleteFolder}
          onRenameChange={onRenameChange}
          onSelectItem={onSelectItem}
          searchTerm={searchTerm}
          onStartRename={onStartRename}
          renameError={renameError}
          renameTarget={renameTarget}
          root={root}
          t={t}
        />
      ))}
    </TreeItem>
  ) : (
    <TreeItem
      itemId={`${fileItemPrefix}:${node.assetId}`}
      label={
        <Box
          draggable
          onClick={() => onSelectItem(`${fileItemPrefix}:${node.assetId}`)}
          onDragEnd={onDragEnd}
          onDragStart={(event) =>
            onDragStartFile(event, node.assetId, node.path)
          }
        >
          <AssetTreeLeaf
            action={
              <Stack direction="row" spacing={0.25}>
                <AssetTreeAction
                  label={t('options.assets.renameItem')}
                  onClick={() =>
                    onStartRename(
                      {
                        kind: fileRenameKind,
                        id: node.assetId,
                        path: node.path,
                        value: node.label
                      } as AssetRenameTarget,
                      `${fileItemPrefix}:${node.assetId}`
                    )
                  }
                >
                  <EditOutlined fontSize="inherit" />
                </AssetTreeAction>
                <AssetTreeAction
                  label={t('options.assets.deleteItem')}
                  onClick={() => onDeleteFile(node.assetId)}
                >
                  <DeleteOutlineOutlined fontSize="inherit" />
                </AssetTreeAction>
              </Stack>
            }
            dragging={
              dragItem?.kind === 'file' &&
              dragItem.root === root &&
              dragItem.id === node.assetId
            }
            icon={<DescriptionOutlined fontSize="small" />}
            label={
              renameTarget?.kind === fileRenameKind &&
              renameTarget.id === node.assetId ? (
                <AssetTreeRenameField
                  error={renameError}
                  onCancel={onCancelRename}
                  onChange={onRenameChange}
                  onCommit={onCommitRename}
                  value={renameTarget.value}
                />
              ) : (
                <Typography variant="body2" noWrap>
                  {renderHighlightedText(node.label, searchTerm)}
                </Typography>
              )
            }
          />
        </Box>
      }
    />
  )
}

function AssetSkillTreeNode({
  dragItem,
  dropTargetItemId,
  onDragEnd,
  onDragOverFolder,
  onDragStartFolder,
  onDragStartSkill,
  onDropFolder,
  onCancelRename,
  onCommitRename,
  node,
  onAddFolder,
  onDeleteFolder,
  onDeleteSkill,
  onRenameChange,
  onSelectItem,
  searchTerm,
  onStartRename,
  renameError,
  renameTarget,
  t
}: {
  dragItem: AssetDragItem | undefined
  dropTargetItemId: string | undefined
  onDragEnd: () => void
  onDragOverFolder: (
    event: ReactDragEvent<HTMLElement>,
    path: string
  ) => void
  onDragStartFolder: (
    event: ReactDragEvent<HTMLElement>,
    path: string
  ) => void
  onDragStartSkill: (
    event: ReactDragEvent<HTMLElement>,
    skillId: string,
    path: string
  ) => void
  onDropFolder: (event: ReactDragEvent<HTMLElement>, path: string) => void
  onCancelRename: () => void
  onCommitRename: () => void
  node: SkillTreeNode
  onAddFolder: (event: ReactMouseEvent<HTMLButtonElement>, path: string) => void
  onDeleteFolder: (path: string) => void
  onDeleteSkill: (skillId: string) => void
  onRenameChange: (value: string) => void
  onSelectItem: (itemId: string) => void
  searchTerm?: string
  onStartRename: (target: AssetRenameTarget, itemId: string) => void
  renameError: boolean
  renameTarget: AssetRenameTarget | undefined
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  return node.kind === 'folder' ? (
    <TreeItem
      itemId={`skill-folder:${node.path}`}
      label={
        <Box
          draggable
          onClick={() => onSelectItem(`skill-folder:${node.path}`)}
          onDragEnd={onDragEnd}
          onDragOver={(event) => onDragOverFolder(event, node.path)}
          onDragStart={(event) => onDragStartFolder(event, node.path)}
          onDrop={(event) => onDropFolder(event, node.path)}
        >
          <AssetTreeLeaf
            action={
              <Stack direction="row" spacing={0.25}>
                <AssetTreeAction
                  label={t('options.assets.renameItem')}
                  onClick={() =>
                    onStartRename(
                      {
                        kind: 'skill-folder',
                        path: node.path,
                        value: node.label
                      },
                      `skill-folder:${node.path}`
                    )
                  }
                >
                  <EditOutlined fontSize="inherit" />
                </AssetTreeAction>
                <AssetTreeAction
                  label={t('options.assets.skills.create')}
                  onClick={(event) => onAddFolder(event, node.path)}
                >
                  <AddOutlined fontSize="inherit" />
                </AssetTreeAction>
                <AssetTreeAction
                  label={t('options.assets.skills.deleteFolder')}
                  onClick={() => onDeleteFolder(node.path)}
                >
                  <DeleteOutlineOutlined fontSize="inherit" />
                </AssetTreeAction>
              </Stack>
            }
            dragging={
              dragItem?.root === 'skills' &&
              dragItem.kind === 'folder' &&
              dragItem.path === node.path
            }
            dropActive={dropTargetItemId === `skill-folder:${node.path}`}
            icon={<FolderOutlined fontSize="small" />}
            label={
              renameTarget?.kind === 'skill-folder' &&
              renameTarget.path === node.path ? (
                <AssetTreeRenameField
                  error={renameError}
                  onCancel={onCancelRename}
                  onChange={onRenameChange}
                  onCommit={onCommitRename}
                  value={renameTarget.value}
                />
              ) : (
                <Typography variant="body2" noWrap>
                  {renderHighlightedText(node.label, searchTerm)}
                </Typography>
              )
            }
          />
        </Box>
      }
    >
      {node.children.map((child) => (
        <AssetSkillTreeNode
          dragItem={dragItem}
          dropTargetItemId={dropTargetItemId}
          onDragEnd={onDragEnd}
          onDragOverFolder={onDragOverFolder}
          onDragStartFolder={onDragStartFolder}
          onDragStartSkill={onDragStartSkill}
          onDropFolder={onDropFolder}
          onCancelRename={onCancelRename}
          onCommitRename={onCommitRename}
          key={child.id}
          node={child}
          onAddFolder={onAddFolder}
          onDeleteFolder={onDeleteFolder}
          onDeleteSkill={onDeleteSkill}
          onRenameChange={onRenameChange}
          onSelectItem={onSelectItem}
          searchTerm={searchTerm}
          onStartRename={onStartRename}
          renameError={renameError}
          renameTarget={renameTarget}
          t={t}
        />
      ))}
    </TreeItem>
  ) : (
    <TreeItem
      itemId={`skill:${node.skillId}`}
      label={
        <Box
          draggable
          onClick={() => onSelectItem(`skill:${node.skillId}`)}
          onDragEnd={onDragEnd}
          onDragStart={(event) =>
            onDragStartSkill(event, node.skillId, node.path)
          }
        >
          <AssetTreeLeaf
            action={
              <Stack direction="row" spacing={0.25}>
                <AssetTreeAction
                  label={t('options.assets.renameItem')}
                  onClick={() =>
                    onStartRename(
                      {
                        kind: 'skill',
                        skillId: node.skillId,
                        path: node.path,
                        value: node.label
                      },
                      `skill:${node.skillId}`
                    )
                  }
                >
                  <EditOutlined fontSize="inherit" />
                </AssetTreeAction>
                <AssetTreeAction
                  label={t('options.assets.deleteItem')}
                  onClick={() => onDeleteSkill(node.skillId)}
                >
                  <DeleteOutlineOutlined fontSize="inherit" />
                </AssetTreeAction>
              </Stack>
            }
            dragging={
              dragItem?.root === 'skills' &&
              dragItem.kind === 'file' &&
              dragItem.id === node.skillId
            }
            icon={<DescriptionOutlined fontSize="small" />}
            label={
              renameTarget?.kind === 'skill' &&
              renameTarget.skillId === node.skillId ? (
                <AssetTreeRenameField
                  error={renameError}
                  onCancel={onCancelRename}
                  onChange={onRenameChange}
                  onCommit={onCommitRename}
                  value={renameTarget.value}
                />
              ) : (
                <Typography variant="body2" noWrap>
                  {renderHighlightedText(`${node.label}.md`, searchTerm)}
                </Typography>
              )
            }
          />
        </Box>
      }
    />
  )
}

function AssetEmptyState({
  actions,
  label,
  minHeight = 360
}: {
  actions?: ReactNode
  label: string
  minHeight?: number
}) {
  return (
    <Stack
      spacing={1.25}
      justifyContent="center"
      alignItems="flex-start"
      sx={{
        minHeight,
        px: 0,
        py: 1
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      {actions}
    </Stack>
  )
}

function AssetScopePanel({
  breadcrumbs,
  emptyLabel,
  entries,
  onOpenItem,
  openParentLabel,
  parentItemId,
  path,
  searchTerm,
  title
}: {
  breadcrumbs?: AssetBreadcrumb[]
  emptyLabel: string
  entries: AssetScopeEntry[]
  onOpenItem: (itemId: string) => void
  openParentLabel: string
  parentItemId?: string
  path?: string
  searchTerm?: string
  title: string
}) {
  if (entries.length === 0) {
    return (
      <Stack spacing={1.25} sx={{ minWidth: 0 }}>
        <AssetContextHeader
          breadcrumbs={breadcrumbs}
          onOpenItem={onOpenItem}
          path={path}
          title={title}
        />
        {parentItemId ? (
          <AssetScopeParentEntry
            itemId={parentItemId}
            label={openParentLabel}
            onOpenItem={onOpenItem}
          />
        ) : null}
        <AssetEmptyState label={emptyLabel} />
      </Stack>
    )
  }

  return (
    <Stack spacing={1.25} sx={{ minWidth: 0 }}>
      <AssetContextHeader
        breadcrumbs={breadcrumbs}
        onOpenItem={onOpenItem}
        path={path}
        title={title}
      />
      <Stack spacing={0}>
        {parentItemId ? (
          <AssetScopeParentEntry
            itemId={parentItemId}
            label={openParentLabel}
            onOpenItem={onOpenItem}
          />
        ) : null}
        {entries.map((item) => (
          <ButtonBase
            key={item.itemId}
            onClick={() => onOpenItem(item.itemId)}
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
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                minWidth: 0,
                width: '100%'
              }}
            >
              {item.kind === 'folder' ? (
                <FolderOutlined fontSize="small" color="action" />
              ) : (
                <DescriptionOutlined fontSize="small" color="action" />
              )}
              <Stack spacing={0.25} sx={{ minWidth: 0, width: '100%' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {renderHighlightedText(item.title, searchTerm)}
                </Typography>
                {item.subtitle ? (
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {renderHighlightedText(item.subtitle, searchTerm)}
                  </Typography>
                ) : null}
              </Stack>
            </Box>
          </ButtonBase>
        ))}
      </Stack>
    </Stack>
  )
}

function renderHighlightedText(text: string, searchTerm?: string) {
  const needle = searchTerm?.trim()

  if (!needle) {
    return text
  }

  const lowerText = text.toLocaleLowerCase()
  const lowerNeedle = needle.toLocaleLowerCase()

  if (!lowerText.includes(lowerNeedle)) {
    return text
  }

  const segments: ReactNode[] = []
  let cursor = 0
  let matchIndex = lowerText.indexOf(lowerNeedle, cursor)

  while (matchIndex !== -1) {
    if (matchIndex > cursor) {
      segments.push(text.slice(cursor, matchIndex))
    }

    const endIndex = matchIndex + needle.length
    segments.push(
      <Box
        component="span"
        key={`${matchIndex}-${endIndex}`}
        sx={{
          bgcolor: 'action.selected',
          borderRadius: 0.5,
          px: 0.25
        }}
      >
        {text.slice(matchIndex, endIndex)}
      </Box>
    )
    cursor = endIndex
    matchIndex = lowerText.indexOf(lowerNeedle, cursor)
  }

  if (cursor < text.length) {
    segments.push(text.slice(cursor))
  }

  return segments
}

function AssetScopeParentEntry({
  itemId,
  label,
  onOpenItem
}: {
  itemId: string
  label: string
  onOpenItem: (itemId: string) => void
}) {
  return (
    <ButtonBase
      aria-label={label}
      onClick={() => onOpenItem(itemId)}
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
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          minWidth: 0,
          width: '100%'
        }}
      >
        <ArrowBackOutlined fontSize="small" color="action" />
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          ..
        </Typography>
      </Box>
    </ButtonBase>
  )
}

function buildFlowScopeEntries(
  nodes: AssetFileTreeNode[],
  recordingsById: Map<string, RouteClientRecording>,
  t: (key: string, values?: Record<string, string | number>) => string
): AssetScopeEntry[] {
  return nodes.map((node) => {
    if (node.kind === 'folder') {
      return {
        itemId: `flow-folder:${node.path}`,
        kind: 'folder',
        title: node.label,
        subtitle: describeScopeFolder(node.children.length, t)
      }
    }

    const recording = recordingsById.get(node.assetId)

    return {
      itemId: `flow:${node.assetId}`,
      kind: 'file',
      title: recording?.name || basename(node.path),
      subtitle: [
        node.path,
        recording?.mode === 'script'
          ? t('options.assets.flows.mode.script')
          : t('options.assets.flows.steps', {
              count: recording?.steps.length ?? 0
            })
      ].join(' · ')
    }
  })
}

function buildResourceScopeEntries(
  nodes: AssetFileTreeNode[],
  resourcesById: Map<string, RouteSelectorResource>,
  t: (key: string, values?: Record<string, string | number>) => string
): AssetScopeEntry[] {
  return nodes.map((node) => {
    if (node.kind === 'folder') {
      return {
        itemId: `resource-folder:${node.path}`,
        kind: 'folder',
        title: node.label,
        subtitle: describeScopeFolder(node.children.length, t)
      }
    }

    const resource = resourcesById.get(node.assetId)

    return {
      itemId: `resource:${node.assetId}`,
      kind: 'file',
      title: resource?.name || basename(node.path),
      subtitle: [node.path, resource?.selector || resource?.tagName]
        .filter(Boolean)
        .join(' · ')
    }
  })
}

function buildSkillScopeEntries(
  nodes: SkillTreeNode[],
  skillsById: Map<string, RouteSkillEntry>,
  t: (key: string, values?: Record<string, string | number>) => string
): AssetScopeEntry[] {
  return nodes.map((node) => {
    if (node.kind === 'folder') {
      return {
        itemId: `skill-folder:${node.path}`,
        kind: 'folder',
        title: node.label,
        subtitle: describeScopeFolder(node.children.length, t)
      }
    }

    const skill = skillsById.get(node.skillId)

    return {
      itemId: `skill:${node.skillId}`,
      kind: 'file',
      title: `${basename(node.path)}.md`,
      subtitle:
        skill?.metadata.title && skill.metadata.title !== basename(node.path)
          ? `${skill.metadata.title} · ${node.path}`
          : node.path
    }
  })
}

function describeScopeFolder(
  count: number,
  t: (key: string, values?: Record<string, string | number>) => string
) {
  return t('options.assets.scopeChildren', { count })
}

function buildAssetBreadcrumbs({
  folderItemPrefix,
  path,
  rootItemId,
  rootLabel
}: {
  folderItemPrefix: 'flow-folder' | 'resource-folder' | 'skill-folder'
  path: string | undefined
  rootItemId: string
  rootLabel: string
}): AssetBreadcrumb[] | undefined {
  if (!path) {
    return undefined
  }

  return [
    {
      itemId: rootItemId,
      label: rootLabel
    },
    ...listAncestorFolders(path).map((folderPath) => ({
      itemId: `${folderItemPrefix}:${folderPath}`,
      label: basename(folderPath)
    }))
  ]
}

function getParentScopeItemId({
  folderItemPrefix,
  path,
  rootItemId
}: {
  folderItemPrefix: 'flow-folder' | 'resource-folder' | 'skill-folder'
  path: string | undefined
  rootItemId: string
}): string | undefined {
  if (!path) {
    return undefined
  }

  const parentPath = dirname(path)
  return parentPath ? `${folderItemPrefix}:${parentPath}` : rootItemId
}

function getAssetFolderChildren(
  nodes: AssetFileTreeNode[],
  folderPath: string | undefined
): AssetFileTreeNode[] {
  if (!folderPath) {
    return nodes
  }

  for (const node of nodes) {
    if (node.kind !== 'folder') {
      continue
    }

    if (node.path === folderPath) {
      return node.children
    }

    const nested = getAssetFolderChildren(node.children, folderPath)

    if (nested.length > 0) {
      return nested
    }
  }

  return []
}

function getSkillFolderChildren(
  nodes: SkillTreeNode[],
  folderPath: string | undefined
): SkillTreeNode[] {
  if (!folderPath) {
    return nodes
  }

  for (const node of nodes) {
    if (node.kind !== 'folder') {
      continue
    }

    if (node.path === folderPath) {
      return node.children
    }

    const nested = getSkillFolderChildren(node.children, folderPath)

    if (nested.length > 0) {
      return nested
    }
  }

  return []
}

function getSelectedRoot(itemId: string): AssetTreeRoot {
  if (itemId.startsWith('root:')) {
    return itemId.slice('root:'.length) as AssetTreeRoot
  }

  if (itemId.startsWith('flow:') || itemId.startsWith('flow-folder:')) {
    return 'flows'
  }

  if (
    itemId.startsWith('resource:') ||
    itemId.startsWith('resource-folder:')
  ) {
    return 'resources'
  }

  return 'skills'
}

function listAncestorFolders(path: string): string[] {
  const segments = splitSkillPath(path)
  const folders: string[] = []

  for (let index = 1; index < segments.length; index += 1) {
    folders.push(segments.slice(0, index).join('/'))
  }

  return folders
}

function dirname(path: string): string {
  const segments = splitSkillPath(path)
  return segments.slice(0, -1).join('/')
}

function basename(path: string): string {
  const segments = splitSkillPath(path)
  return segments.at(-1) ?? ''
}

function collectSkillItemIds(nodes: SkillTreeNode[]): string[] {
  return nodes.flatMap((node) =>
    node.kind === 'folder'
      ? [`skill-folder:${node.path}`, ...collectSkillItemIds(node.children)]
      : [`skill:${node.skillId}`]
  )
}

function collectAssetItemIds(
  prefix: 'flow' | 'resource',
  nodes: AssetFileTreeNode[]
): string[] {
  return nodes.flatMap((node) =>
    node.kind === 'folder'
      ? [
          `${prefix}-folder:${node.path}`,
          ...collectAssetItemIds(prefix, node.children)
        ]
      : [`${prefix}:${node.assetId}`]
  )
}

function collectSkillFolderPaths(nodes: SkillTreeNode[]): string[] {
  return nodes.flatMap((node) =>
    node.kind === 'folder'
      ? [node.path, ...collectSkillFolderPaths(node.children)]
      : []
  )
}

function collectAssetFolderPaths(nodes: AssetFileTreeNode[]): string[] {
  return nodes.flatMap((node) =>
    node.kind === 'folder'
      ? [node.path, ...collectAssetFolderPaths(node.children)]
      : []
  )
}

function countSkillLeaves(nodes: SkillTreeNode[]): number {
  return nodes.reduce(
    (count, node) =>
      count +
      (node.kind === 'folder' ? countSkillLeaves(node.children) : 1),
    0
  )
}

function countAssetFiles(nodes: AssetFileTreeNode[]): number {
  return nodes.reduce(
    (count, node) =>
      count + (node.kind === 'folder' ? countAssetFiles(node.children) : 1),
    0
  )
}

function getFirstSearchResultItemId(
  selectedRoot: AssetTreeRoot,
  flowNodes: AssetFileTreeNode[],
  resourceNodes: AssetFileTreeNode[],
  skillNodes: SkillTreeNode[]
): string | undefined {
  const candidates =
    selectedRoot === 'flows'
      ? [
          findFirstAssetTreeItemId('flow', flowNodes),
          findFirstAssetTreeItemId('resource', resourceNodes),
          findFirstSkillTreeItemId(skillNodes)
        ]
      : selectedRoot === 'resources'
      ? [
          findFirstAssetTreeItemId('resource', resourceNodes),
          findFirstAssetTreeItemId('flow', flowNodes),
          findFirstSkillTreeItemId(skillNodes)
        ]
      : [
          findFirstSkillTreeItemId(skillNodes),
          findFirstAssetTreeItemId('flow', flowNodes),
          findFirstAssetTreeItemId('resource', resourceNodes)
        ]

  return candidates.find(Boolean)
}

function findFirstAssetTreeItemId(
  prefix: 'flow' | 'resource',
  nodes: AssetFileTreeNode[]
): string | undefined {
  for (const node of nodes) {
    if (node.kind === 'folder') {
      return `${prefix}-folder:${node.path}`
    }

    return `${prefix}:${node.assetId}`
  }

  return undefined
}

function findFirstSkillTreeItemId(nodes: SkillTreeNode[]): string | undefined {
  for (const node of nodes) {
    if (node.kind === 'folder') {
      return `skill-folder:${node.path}`
    }

    return `skill:${node.skillId}`
  }

  return undefined
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  )
}

function canDropAssetItem(
  dragItem: AssetDragItem,
  target: AssetDropTarget
): boolean {
  if (dragItem.root !== target.root) {
    return false
  }

  const nextParentPath = normalizeEditableSkillPath(target.folderPath ?? '')
  const currentParentPath = dirname(dragItem.path)

  if (dragItem.kind === 'file') {
    return nextParentPath !== currentParentPath
  }

  if (!nextParentPath) {
    return currentParentPath.length > 0
  }

  if (nextParentPath === currentParentPath) {
    return false
  }

  return !isFolderWithinFolder(nextParentPath, dragItem.path)
}

function remapExpandedFolderPaths(
  paths: string[],
  fromFolderPath: string,
  toFolderPath: string
): string[] {
  return [
    ...new Set([
      ...paths.map((path) =>
        isFolderWithinFolder(path, fromFolderPath)
          ? path === fromFolderPath
            ? toFolderPath
            : `${toFolderPath}/${path.slice(fromFolderPath.length + 1)}`
          : path
      ),
      ...listAncestorFolders(toFolderPath),
      toFolderPath
    ])
  ]
}

function remapFolderSelectionItemId(
  itemId: string,
  prefix: 'flow-folder' | 'resource-folder' | 'skill-folder',
  fromFolderPath: string,
  toFolderPath: string
): string {
  if (!itemId.startsWith(`${prefix}:`)) {
    return itemId
  }

  const currentPath = itemId.slice(prefix.length + 1)

  if (!isFolderWithinFolder(currentPath, fromFolderPath)) {
    return itemId
  }

  return `${prefix}:${
    currentPath === fromFolderPath
      ? toFolderPath
      : `${toFolderPath}/${currentPath.slice(fromFolderPath.length + 1)}`
  }`
}

function createUniqueAssetFolderPath(
  existingPaths: string[],
  parentPath: string,
  baseName: string
): string {
  const normalizedParent = normalizeEditableSkillPath(parentPath)
  const existingFilePaths = existingPaths.map((path) =>
    normalizeEditableSkillPath(path)
  )
  const existingFolderPaths = listAssetFolders(
    existingPaths.map((path, index) => ({
      id: String(index),
      path
    }))
  )
  let attempt = 1

  while (true) {
    const suffix = attempt === 1 ? baseName : `${baseName}-${attempt}`
    const candidate = normalizedParent
      ? `${normalizedParent}/${suffix}`
      : suffix

    if (
      !existingFilePaths.includes(candidate) &&
      !existingFolderPaths.includes(candidate)
    ) {
      return candidate
    }

    attempt += 1
  }
}

function createUniqueSkillPathInTree(
  skills: RouteSkillEntry[],
  folders: RouteSkillFolder[],
  parentPath: string,
  baseName: string
): string {
  const normalizedParent = normalizeEditableSkillPath(parentPath)
  const existingFilePaths = skills.map((skill) =>
    normalizeEditableSkillPath(skill.path)
  )
  const existingFolderPaths = listTreeFolders(skills, folders)
  let attempt = 1

  while (true) {
    const suffix = attempt === 1 ? baseName : `${baseName}-${attempt}`
    const candidate = normalizedParent
      ? `${normalizedParent}/${suffix}`
      : suffix

    if (
      !existingFilePaths.includes(candidate) &&
      !existingFolderPaths.includes(candidate)
    ) {
      return candidate
    }

    attempt += 1
  }
}

function createUniqueSkillFolderMovePath(
  skills: RouteSkillEntry[],
  folders: RouteSkillFolder[],
  movingFolderPath: string,
  parentPath: string,
  baseName: string
): string {
  return createUniqueAssetFolderPath(
    [
      ...skills
        .filter((skill) => !isPathWithinFolder(skill.path, movingFolderPath))
        .map((skill) => skill.path),
      ...folders
        .filter((folder) => !isFolderWithinFolder(folder.path, movingFolderPath))
        .map((folder) => folder.path)
    ],
    parentPath,
    baseName
  )
}

function buildAssetFileTree<
  TItem extends {
    id: string
    path: string
    name: string
  }
>(
  items: TItem[],
  searchText: (item: TItem) => string
): AssetFileTreeNode[] {
  const root: AssetFileTreeNode[] = []
  const folderNodes = new Map<
    string,
    Extract<AssetFileTreeNode, { kind: 'folder' }>
  >()

  for (const folderPath of listAssetFolders(items)) {
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

  for (const item of [...items].sort((left, right) =>
    left.path.localeCompare(right.path)
  )) {
    const segments = splitSkillPath(item.path)

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
      kind: 'file',
      id: `file:${item.id}`,
      assetId: item.id,
      path: item.path,
      label: segments.at(-1) ?? item.name,
      searchText: searchText(item)
    })
  }

  return sortAssetFileTree(root)
}

function filterAssetFileTree(
  nodes: AssetFileTreeNode[],
  searchQuery: string
): AssetFileTreeNode[] {
  const normalizedQuery = searchQuery.trim().toLowerCase()

  if (!normalizedQuery) {
    return nodes
  }

  return nodes.reduce<AssetFileTreeNode[]>((result, node) => {
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

      const filteredChildren = filterAssetFileTree(node.children, normalizedQuery)

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

function getAssetRenameError(
  target: AssetRenameTarget | undefined,
  client: RouteClientConfig
): boolean {
  if (!target) {
    return false
  }

  if (target.kind === 'flow') {
    const nextLeaf = normalizeEditableTreeLabel(target.value)

    if (!nextLeaf) {
      return true
    }

    const nextPath = replacePathLeaf(target.path, nextLeaf)

    return pathExistsInAssetTree(client.recordings, nextPath, target.id)
  }

  if (target.kind === 'flow-folder') {
    return hasAssetFolderRenameConflict(
      client.recordings,
      target.path,
      normalizeEditableTreeLabel(target.value)
    )
  }

  if (target.kind === 'resource') {
    const nextLeaf = normalizeEditableTreeLabel(target.value)

    if (!nextLeaf) {
      return true
    }

    const nextPath = replacePathLeaf(target.path, nextLeaf)

    return pathExistsInAssetTree(client.selectorResources, nextPath, target.id)
  }

  if (target.kind === 'resource-folder') {
    return hasAssetFolderRenameConflict(
      client.selectorResources,
      target.path,
      normalizeEditableTreeLabel(target.value)
    )
  }

  if (target.kind === 'skill') {
    const nextLeaf = normalizeEditableTreeLabel(target.value)

    if (!nextLeaf) {
      return true
    }

    const nextPath = replacePathLeaf(target.path, nextLeaf)

    return client.skillEntries.some(
      (skill) =>
        skill.id !== target.skillId &&
        normalizeEditableSkillPath(skill.path) === nextPath
    )
  }

  const nextLeaf = normalizeEditableTreeLabel(target.value)

  if (!nextLeaf) {
    return true
  }

  const nextFolderPath = replacePathLeaf(target.path, nextLeaf)

  if (
    nextFolderPath !== normalizeEditableSkillPath(target.path) &&
    pathExistsAsFileOrFolder(
      client.skillEntries,
      client.skillFolders,
      nextFolderPath
    )
  ) {
    return true
  }

  const nextSkills = renameFolderSkills(
    client.skillEntries,
    target.path,
    nextFolderPath
  )
  const nextFolders = renameFolderFolders(
    client.skillFolders,
    target.path,
    nextFolderPath
  )

  const nextPaths = nextSkills.map((skill) =>
    normalizeEditableSkillPath(skill.path)
  )
  const nextFolderPaths = nextFolders.map((folder) =>
    normalizeEditableSkillPath(folder.path)
  )

  return (
    new Set(nextPaths).size !== nextPaths.length ||
    new Set(nextFolderPaths).size !== nextFolderPaths.length
  )
}

function getResourcePathState(
  resource: RouteSelectorResource | undefined,
  resources: RouteSelectorResource[],
  pathInput: string,
  t: (key: string) => string
): {
  error: boolean
  helperText?: string
} {
  if (!resource) {
    return { error: false }
  }

  const normalizedPath = normalizeEditableSkillPath(pathInput)

  if (!normalizedPath) {
    return {
      error: true,
      helperText: t('options.assets.pathInvalid')
    }
  }

  if (pathExistsInAssetTree(resources, normalizedPath, resource.id)) {
    return {
      error: true,
      helperText: t('options.assets.pathConflict')
    }
  }

  return {
    error: false
  }
}

function replacePathLeaf(path: string, nextLeaf: string): string {
  const parentPath = dirname(path)
  return parentPath ? `${parentPath}/${nextLeaf}` : nextLeaf
}

function normalizeEditableTreeLabel(value: string): string {
  const segments = splitSkillPath(value)
  return segments.at(-1) ?? ''
}

function createUniqueAssetPath(
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

function listAssetFolders<TItem extends { path: string }>(items: TItem[]): string[] {
  return [
    ...new Set(items.flatMap((item) => listAncestorFolders(item.path)))
  ].sort((left, right) => left.localeCompare(right))
}

function sortAssetFileTree(nodes: AssetFileTreeNode[]): AssetFileTreeNode[] {
  return [...nodes]
    .map((node) =>
      node.kind === 'folder'
        ? {
            ...node,
            children: sortAssetFileTree(node.children)
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

function pathExistsInAssetTree<TItem extends { id: string; path: string }>(
  items: TItem[],
  path: string,
  currentId?: string
): boolean {
  const normalizedPath = normalizeEditableSkillPath(path)
  const nextItems = items.filter((item) => item.id !== currentId)
  const folderPaths = new Set(listAssetFolders(nextItems))

  return (
    nextItems.some(
      (item) => normalizeEditableSkillPath(item.path) === normalizedPath
    ) || folderPaths.has(normalizedPath)
  )
}

function renameAssetFolderPaths<TItem extends { path: string }>(
  items: TItem[],
  fromFolderPath: string,
  toFolderPath: string
): TItem[] {
  const normalizedFrom = normalizeEditableSkillPath(fromFolderPath)
  const normalizedTo = normalizeEditableSkillPath(toFolderPath)

  return items.map((item) =>
    isPathWithinFolder(item.path, normalizedFrom)
      ? {
          ...item,
          path: `${normalizedTo}/${normalizeEditableSkillPath(item.path).slice(
            normalizedFrom.length + 1
          )}`
        }
      : item
  )
}

function hasAssetFolderRenameConflict<TItem extends { id: string; path: string }>(
  items: TItem[],
  currentPath: string,
  nextLeaf: string
): boolean {
  if (!nextLeaf) {
    return true
  }

  const nextFolderPath = replacePathLeaf(currentPath, nextLeaf)
  const existingFolderPaths = listAssetFolders(items).filter(
    (path) => !isFolderWithinFolder(path, currentPath)
  )

  if (
    nextFolderPath !== normalizeEditableSkillPath(currentPath) &&
    existingFolderPaths.includes(nextFolderPath)
  ) {
    return true
  }

  const nextItems = renameAssetFolderPaths(items, currentPath, nextFolderPath)
  const nextPaths = nextItems.map((item) => normalizeEditableSkillPath(item.path))
  const nextFolderPaths = listAssetFolders(nextItems)

  return (
    new Set(nextPaths).size !== nextPaths.length ||
    nextFolderPaths.some((folderPath) => nextPaths.includes(folderPath)) ||
    nextFolderPaths.filter((path, index, array) => array.indexOf(path) !== index)
      .length > 0
  )
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

function isFolderWithinFolder(path: string, folderPath: string): boolean {
  const normalizedPath = normalizeEditableSkillPath(path)
  const normalizedFolderPath = normalizeEditableSkillPath(folderPath)

  return (
    normalizedPath === normalizedFolderPath ||
    normalizedPath.startsWith(`${normalizedFolderPath}/`)
  )
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
