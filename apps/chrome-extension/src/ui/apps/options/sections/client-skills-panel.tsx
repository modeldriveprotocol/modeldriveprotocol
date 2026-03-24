import AddOutlined from '@mui/icons-material/AddOutlined'
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import CreateNewFolderOutlined from '@mui/icons-material/CreateNewFolderOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import DoneOutlined from '@mui/icons-material/DoneOutlined'
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined'
import FolderOutlined from '@mui/icons-material/FolderOutlined'
import {
  Box,
  Chip,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'

import type {
  ClientIconKey,
  RouteClientConfig,
  RouteSkillEntry,
  RouteSkillFolder,
  RouteSkillParameter
} from '#~/shared/config.js'
import {
  MonacoCodeEditor,
  type MonacoCodeEditorHandle
} from '../../../foundation/monaco-editor.js'
import { useI18n } from '../../../i18n/provider.js'
import { IconPicker } from '../icon-picker.js'
import { ToolbarIcon } from '../shared.js'
import { createLocalId } from '../types.js'

const DEFAULT_SKILL_MARKDOWN = '# Skill\n\nDescribe the workflow here.\n'

type SkillTreeNode =
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
    }

type SkillTemplateToken = {
  token: string
  summary: string
}

export function ClientSkillsPanel({
  client,
  onChange
}: {
  client: RouteClientConfig
  onChange: (client: RouteClientConfig) => void
}) {
  const { t } = useI18n()
  const [selectedSkillId, setSelectedSkillId] = useState<string>()
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>()
  const [expandedFolders, setExpandedFolders] = useState<string[]>([])
  const [pathInput, setPathInput] = useState('')
  const [folderDraftPath, setFolderDraftPath] = useState('')
  const [folderPathInput, setFolderPathInput] = useState('')
  const editorRef = useRef<MonacoCodeEditorHandle | null>(null)
  const folderPaths = useMemo(
    () => listTreeFolders(client.skillEntries, client.skillFolders),
    [client.skillEntries, client.skillFolders]
  )

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

  useEffect(() => {
    setPathInput(selectedSkill?.path ?? '')
  }, [selectedSkill?.id, selectedSkill?.path])

  useEffect(() => {
    setFolderPathInput(selectedFolderPath ?? '')
  }, [selectedFolderPath])

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
  const availableTokens = useMemo(
    () => buildSkillTokens(selectedSkill),
    [selectedSkill]
  )
  const selectedSkillPathState = useMemo(
    () => getSkillPathState(selectedSkill, client.skillEntries, pathInput, t),
    [client.skillEntries, pathInput, selectedSkill, t]
  )
  const selectedFolderPathState = useMemo(
    () =>
      getFolderPathState(
        selectedFolderPath,
        client.skillEntries,
        client.skillFolders,
        folderPathInput,
        t
      ),
    [
      client.skillEntries,
      client.skillFolders,
      folderPathInput,
      selectedFolderPath,
      t
    ]
  )
  const folderDraftState = useMemo(
    () =>
      getFolderDraftState(
        client.skillEntries,
        client.skillFolders,
        folderDraftPath,
        t
      ),
    [client.skillEntries, client.skillFolders, folderDraftPath, t]
  )

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
      title: t('options.assets.skills.newTitle'),
      summary: '',
      icon: 'spark' as ClientIconKey,
      queryParameters: [],
      headerParameters: [],
      content: DEFAULT_SKILL_MARKDOWN
    }

    updateSkills((skills) => [...skills, nextSkill])
    setSelectedSkillId(nextSkill.id)
    setSelectedFolderPath(undefined)
    setExpandedFolders((current) => [
      ...new Set([...current, ...listAncestorFolders(nextSkill.path)])
    ])
  }

  function openFolderDraft() {
    setFolderDraftPath(
      createUniqueFolderPath(
        client.skillEntries.map((skill) => skill.path),
        client.skillFolders,
        resolveCurrentFolderPath(),
        'new-folder'
      )
    )
  }

  function deleteSkill(skillId: string) {
    updateSkills((skills) => skills.filter((skill) => skill.id !== skillId))
    setSelectedSkillId((current) => (current === skillId ? undefined : current))
  }

  function addParameter(skillId: string, kind: 'query' | 'header') {
    updateSkill(skillId, (skill) => ({
      ...skill,
      ...(kind === 'query'
        ? {
            queryParameters: [
              ...skill.queryParameters,
              {
                id: createLocalId('skill-query'),
                key: '',
                summary: ''
              }
            ]
          }
        : {
            headerParameters: [
              ...skill.headerParameters,
              {
                id: createLocalId('skill-header'),
                key: '',
                summary: ''
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
    updateSkill(skillId, (skill) => ({
      ...skill,
      ...(kind === 'query'
        ? {
            queryParameters: skill.queryParameters.map((parameter) =>
              parameter.id === parameterId
                ? { ...parameter, ...patch }
                : parameter
            )
          }
        : {
            headerParameters: skill.headerParameters.map((parameter) =>
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
    updateSkill(skillId, (skill) => ({
      ...skill,
      ...(kind === 'query'
        ? {
            queryParameters: skill.queryParameters.filter(
              (parameter) => parameter.id !== parameterId
            )
          }
        : {
            headerParameters: skill.headerParameters.filter(
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

  function commitSkillPath(skill: RouteSkillEntry | undefined) {
    if (!skill) {
      return
    }

    const nextPath = normalizeEditableSkillPath(pathInput)

    setPathInput(nextPath || skill.path)

    if (!nextPath || nextPath === skill.path) {
      return
    }

    if (hasSkillPathConflict(skill, client.skillEntries, nextPath)) {
      return
    }

    updateSkill(skill.id, (current) => ({
      ...current,
      path: nextPath
    }))
  }

  function commitFolderDraft() {
    const nextFolderPath = normalizeEditableSkillPath(folderDraftPath)

    if (!nextFolderPath || folderDraftState.error) {
      return
    }

    updateFolders((folders) => [
      ...folders,
      {
        id: createLocalId('skill-folder'),
        path: nextFolderPath
      }
    ])
    setSelectedFolderPath(nextFolderPath)
    setExpandedFolders((current) => [
      ...new Set([
        ...current,
        ...listAncestorFolders(nextFolderPath),
        nextFolderPath
      ])
    ])
    setFolderDraftPath('')
  }

  function closeFolderDraft() {
    setFolderDraftPath('')
  }

  function commitFolderPath(folderPath: string | undefined) {
    if (!folderPath) {
      return
    }

    const nextFolderPath = normalizeEditableSkillPath(folderPathInput)

    setFolderPathInput(nextFolderPath || folderPath)

    if (!nextFolderPath || nextFolderPath === folderPath) {
      return
    }

    if (selectedFolderPathState.error) {
      return
    }

    updateSkillAssets(({ skillEntries, skillFolders }) => ({
      skillEntries: renameFolderSkills(
        skillEntries,
        folderPath,
        nextFolderPath
      ),
      skillFolders: renameFolderFolders(
        skillFolders,
        folderPath,
        nextFolderPath
      )
    }))
    setSelectedFolderPath(nextFolderPath)
    setExpandedFolders((current) => {
      const next = new Set(current)
      next.delete(folderPath)
      next.add(nextFolderPath)
      for (const path of listAncestorFolders(nextFolderPath)) {
        next.add(path)
      }
      return [...next]
    })
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

  return (
    <Stack spacing={1.25}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
      >
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {t('options.assets.skills.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('options.assets.skills.description')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          <ToolbarIcon
            label={t('options.assets.skills.addFolder')}
            onClick={() => openFolderDraft()}
          >
            <CreateNewFolderOutlined fontSize="small" />
          </ToolbarIcon>
          <ToolbarIcon
            label={t('options.assets.addSkill')}
            onClick={() => addSkill()}
          >
            <AddOutlined fontSize="small" />
          </ToolbarIcon>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '280px minmax(0, 1fr)' },
          gap: 1.25,
          minHeight: 620
        }}
      >
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
            {folderDraftPath ? (
              <Box
                sx={{
                  px: 1,
                  py: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Stack spacing={0.75}>
                  <TextField
                    autoFocus
                    size="small"
                    label={t('options.assets.skills.newFolder')}
                    value={folderDraftPath}
                    error={folderDraftState.error}
                    helperText={folderDraftState.helperText}
                    onChange={(event) =>
                      setFolderDraftPath(
                        normalizeEditableSkillPath(event.target.value)
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        commitFolderDraft()
                      }

                      if (event.key === 'Escape') {
                        event.preventDefault()
                        closeFolderDraft()
                      }
                    }}
                  />
                  <Stack
                    direction="row"
                    spacing={0.5}
                    justifyContent="flex-end"
                  >
                    <ToolbarIcon
                      label={t('options.assets.skills.cancelFolderDraft')}
                      onClick={() => closeFolderDraft()}
                    >
                      <CloseOutlined fontSize="small" />
                    </ToolbarIcon>
                    <ToolbarIcon
                      disabled={folderDraftState.error}
                      label={t('options.assets.skills.confirmFolderDraft')}
                      onClick={() => commitFolderDraft()}
                    >
                      <DoneOutlined fontSize="small" />
                    </ToolbarIcon>
                  </Stack>
                </Stack>
              </Box>
            ) : null}

            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {tree.length === 0 ? (
                <Stack spacing={0.5} sx={{ px: 1.25, py: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('options.assets.skills.empty')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('options.assets.skills.treeHint')}
                  </Typography>
                </Stack>
              ) : (
                <List disablePadding>
                  {tree.map((node) => (
                    <SkillTreeNodeRow
                      expandedFolders={expandedFolders}
                      key={node.id}
                      node={node}
                      onSelectFolder={selectFolder}
                      onSelectSkill={(skillId) => {
                        setSelectedFolderPath(undefined)
                        setSelectedSkillId(skillId)
                      }}
                      onToggleFolder={toggleFolder}
                      selectedFolderPath={selectedFolderPath}
                      selectedSkillId={selectedSkill?.id}
                    />
                  ))}
                </List>
              )}
            </Box>
          </Stack>
        </Box>

        {selectedSkill ? (
          <Stack spacing={1.25} sx={{ minWidth: 0 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: 1,
                alignItems: 'start'
              }}
            >
              <TextField
                size="small"
                label={t('options.assets.skills.path')}
                value={pathInput}
                error={selectedSkillPathState.error}
                helperText={selectedSkillPathState.helperText}
                onBlur={() => commitSkillPath(selectedSkill)}
                onChange={(event) =>
                  setPathInput(normalizeEditableSkillPath(event.target.value))
                }
              />
              <ToolbarIcon
                label={t('options.assets.deleteItem')}
                onClick={() => deleteSkill(selectedSkill.id)}
              >
                <DeleteOutlineOutlined fontSize="small" />
              </ToolbarIcon>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 180px' },
                gap: 1
              }}
            >
              <TextField
                size="small"
                label={t('options.assets.skills.titleField')}
                value={selectedSkill.title}
                onChange={(event) =>
                  updateSkill(selectedSkill.id, (skill) => ({
                    ...skill,
                    title: event.target.value
                  }))
                }
              />
              <IconPicker
                label={t('common.icon')}
                value={selectedSkill.icon}
                onChange={(icon) =>
                  updateSkill(selectedSkill.id, (skill) => ({
                    ...skill,
                    icon
                  }))
                }
              />
            </Box>

            <TextField
              size="small"
              label={t('common.summary')}
              value={selectedSkill.summary}
              onChange={(event) =>
                updateSkill(selectedSkill.id, (skill) => ({
                  ...skill,
                  summary: event.target.value
                }))
              }
            />

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  xl: 'repeat(2, minmax(0, 1fr))'
                },
                gap: 1.25
              }}
            >
              <SkillParameterPanel
                kind="query"
                onAdd={() => addParameter(selectedSkill.id, 'query')}
                onDelete={(parameterId) =>
                  deleteParameter(selectedSkill.id, 'query', parameterId)
                }
                onUpdate={(parameterId, patch) =>
                  updateParameter(selectedSkill.id, 'query', parameterId, patch)
                }
                parameters={selectedSkill.queryParameters}
                t={t}
                title={t('options.assets.skills.queryParameters')}
              />
              <SkillParameterPanel
                kind="header"
                onAdd={() => addParameter(selectedSkill.id, 'header')}
                onDelete={(parameterId) =>
                  deleteParameter(selectedSkill.id, 'header', parameterId)
                }
                onUpdate={(parameterId, patch) =>
                  updateParameter(
                    selectedSkill.id,
                    'header',
                    parameterId,
                    patch
                  )
                }
                parameters={selectedSkill.headerParameters}
                t={t}
                title={t('options.assets.skills.headerParameters')}
              />
            </Box>

            <Stack spacing={0.75}>
              <Typography variant="subtitle2">
                {t('options.assets.skills.availableVariables')}
              </Typography>
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
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('options.assets.skills.availableVariablesEmpty')}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {t('options.assets.skills.markdownHelp')}
              </Typography>
            </Stack>

            <Stack spacing={0.75}>
              <Typography variant="subtitle2">
                {t('options.assets.skills.markdown')}
              </Typography>
              <MonacoCodeEditor
                ariaLabel={t('options.assets.skills.content')}
                language="markdown"
                minHeight={420}
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
            </Stack>
          </Stack>
        ) : selectedFolderPath ? (
          <Stack spacing={1.25} sx={{ minWidth: 0 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto auto',
                gap: 1,
                alignItems: 'start'
              }}
            >
              <TextField
                size="small"
                label={t('options.assets.skills.folderPath')}
                value={folderPathInput}
                error={selectedFolderPathState.error}
                helperText={selectedFolderPathState.helperText}
                onBlur={() => commitFolderPath(selectedFolderPath)}
                onChange={(event) =>
                  setFolderPathInput(
                    normalizeEditableSkillPath(event.target.value)
                  )
                }
              />
              <ToolbarIcon
                label={t('options.assets.skills.addSkillInFolder')}
                onClick={() => addSkill(selectedFolderPath)}
              >
                <AddOutlined fontSize="small" />
              </ToolbarIcon>
              <ToolbarIcon
                label={t('options.assets.skills.deleteFolder')}
                onClick={() => deleteFolder(selectedFolderPath)}
              >
                <DeleteOutlineOutlined fontSize="small" />
              </ToolbarIcon>
            </Box>

            <Stack spacing={0.5}>
              <Typography variant="subtitle2">
                {t('options.assets.skills.folderSummaryTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('options.assets.skills.folderSummary', {
                  count: selectedFolderSkills.length
                })}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('options.assets.skills.folderHint')}
              </Typography>
            </Stack>
          </Stack>
        ) : (
          <Stack
            spacing={0.75}
            justifyContent="center"
            sx={{
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              px: 2,
              py: 3,
              minHeight: 360
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {t('options.assets.skills.empty')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('options.assets.skills.noSelection')}
            </Typography>
          </Stack>
        )}
      </Box>
    </Stack>
  )
}

function SkillParameterPanel({
  kind,
  onAdd,
  onDelete,
  onUpdate,
  parameters,
  t,
  title
}: {
  kind: 'query' | 'header'
  onAdd: () => void
  onDelete: (parameterId: string) => void
  onUpdate: (parameterId: string, patch: Partial<RouteSkillParameter>) => void
  parameters: RouteSkillParameter[]
  t: (key: string, values?: Record<string, string | number>) => string
  title: string
}) {
  return (
    <Stack
      spacing={1}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        px: 1.25,
        py: 1.1
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
      >
        <Typography variant="subtitle2">{title}</Typography>
        <ToolbarIcon
          label={t(
            kind === 'query'
              ? 'options.assets.skills.addQueryParameter'
              : 'options.assets.skills.addHeaderParameter'
          )}
          onClick={onAdd}
        >
          <AddOutlined fontSize="small" />
        </ToolbarIcon>
      </Stack>

      {parameters.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t(
            kind === 'query'
              ? 'options.assets.skills.queryParametersEmpty'
              : 'options.assets.skills.headerParametersEmpty'
          )}
        </Typography>
      ) : (
        <Stack spacing={0.9}>
          {parameters.map((parameter) => (
            <Box
              key={parameter.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) auto',
                gap: 1,
                alignItems: 'start'
              }}
            >
              <TextField
                size="small"
                label={t('options.assets.skills.parameterKey')}
                value={parameter.key}
                onChange={(event) =>
                  onUpdate(parameter.id, { key: event.target.value })
                }
              />
              <TextField
                size="small"
                label={t('common.summary')}
                value={parameter.summary}
                onChange={(event) =>
                  onUpdate(parameter.id, { summary: event.target.value })
                }
              />
              <ToolbarIcon
                label={t('options.assets.deleteItem')}
                onClick={() => onDelete(parameter.id)}
              >
                <DeleteOutlineOutlined fontSize="small" />
              </ToolbarIcon>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  )
}

function SkillTreeNodeRow({
  expandedFolders,
  node,
  onSelectFolder,
  onSelectSkill,
  onToggleFolder,
  selectedFolderPath,
  selectedSkillId
}: {
  expandedFolders: string[]
  node: SkillTreeNode
  onSelectFolder: (folderPath: string) => void
  onSelectSkill: (skillId: string) => void
  onToggleFolder: (path: string) => void
  selectedFolderPath: string | undefined
  selectedSkillId: string | undefined
}) {
  return (
    <>
      {node.kind === 'folder' ? (
        <>
          <ListItemButton
            selected={selectedFolderPath === node.path}
            onClick={() => {
              onSelectFolder(node.path)
              onToggleFolder(node.path)
            }}
            sx={{ pl: folderPadding(node.path) }}
          >
            <ListItemIcon sx={{ minWidth: 28 }}>
              {expandedFolders.includes(node.path) ? (
                <ExpandMoreOutlined fontSize="small" />
              ) : (
                <ChevronRightOutlined fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemIcon sx={{ minWidth: 28 }}>
              <FolderOutlined fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={node.label}
              primaryTypographyProps={{
                variant: 'body2',
                fontWeight: 600,
                noWrap: true
              }}
            />
          </ListItemButton>
          {expandedFolders.includes(node.path)
            ? node.children.map((child) => (
                <SkillTreeNodeRow
                  expandedFolders={expandedFolders}
                  key={child.id}
                  node={child}
                  onSelectFolder={onSelectFolder}
                  onSelectSkill={onSelectSkill}
                  onToggleFolder={onToggleFolder}
                  selectedFolderPath={selectedFolderPath}
                  selectedSkillId={selectedSkillId}
                />
              ))
            : null}
        </>
      ) : (
        <ListItemButton
          selected={selectedSkillId === node.skillId}
          onClick={() => onSelectSkill(node.skillId)}
          sx={{ pl: folderPadding(node.path) + 7 }}
        >
          <ListItemIcon sx={{ minWidth: 28 }}>
            <DescriptionOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={`${node.label}.md`}
            secondary={node.path}
            primaryTypographyProps={{ variant: 'body2', noWrap: true }}
            secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
          />
        </ListItemButton>
      )}
    </>
  )
}

function buildSkillTokens(
  skill: RouteSkillEntry | undefined
): SkillTemplateToken[] {
  if (!skill) {
    return []
  }

  return [
    ...skill.queryParameters
      .map((parameter) => ({
        token: parameter.key.trim() ? `{{query.${parameter.key.trim()}}}` : '',
        summary: parameter.summary
      }))
      .filter((parameter) => Boolean(parameter.token)),
    ...skill.headerParameters
      .map((parameter) => ({
        token: parameter.key.trim() ? `{{header.${parameter.key.trim()}}}` : '',
        summary: parameter.summary
      }))
      .filter((parameter) => Boolean(parameter.token))
  ]
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

function buildSkillTree(
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
      label: segments.at(-1) ?? skill.title ?? 'skill'
    })
  }

  return sortSkillTreeNodes(root)
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
        title: '',
        summary: '',
        icon: 'spark',
        queryParameters: [],
        headerParameters: [],
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
