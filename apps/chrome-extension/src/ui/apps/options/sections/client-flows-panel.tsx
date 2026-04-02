import AddOutlined from '@mui/icons-material/AddOutlined'
import {
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

import type { RouteClientConfig, RouteClientRecording } from '#~/shared/config.js'
import { MonacoCodeEditor } from '../../../foundation/monaco-editor.js'
import { useI18n } from '../../../i18n/provider.js'
import { ToolbarIcon } from '../shared.js'
import { createLocalId, formatSurfaceUrlLabel } from '../types.js'

const FLOW_SCRIPT_TEMPLATE = `// \`args\` contains the tool input object.
const selector = typeof args?.selector === 'string' ? args.selector : 'button';
const element = document.querySelector(selector);

if (!(element instanceof HTMLElement)) {
  throw new Error(\`Element not found for selector: \${selector}\`);
}

element.click();

return {
  clicked: selector
};
`

export function ClientFlowsPanel({
  client,
  hideHeader = false,
  hideList = false,
  onChange,
  onSelectedFlowIdChange,
  allowEmptySelection = false,
  selectedFlowId: controlledSelectedFlowId
}: {
  client: RouteClientConfig
  hideHeader?: boolean
  hideList?: boolean
  onChange: (next: RouteClientConfig) => void
  onSelectedFlowIdChange?: (flowId?: string) => void
  allowEmptySelection?: boolean
  selectedFlowId?: string
}) {
  const { t } = useI18n()
  const [localSelectedFlowId, setLocalSelectedFlowId] = useState<string | undefined>(
    controlledSelectedFlowId
  )
  const [pathInput, setPathInput] = useState('')
  const isSelectionControlled = controlledSelectedFlowId !== undefined
  const selectedFlowId = controlledSelectedFlowId ?? localSelectedFlowId

  function commitSelectedFlowId(nextSelectedFlowId: string | undefined) {
    if (!isSelectionControlled) {
      setLocalSelectedFlowId((current) =>
        current === nextSelectedFlowId ? current : nextSelectedFlowId
      )
    }

    onSelectedFlowIdChange?.(nextSelectedFlowId)
  }

  useEffect(() => {
    if (isSelectionControlled) {
      return
    }

    const nextSelectedFlowId = getNextSelectedFlowId({
      allowEmptySelection,
      recordings: client.recordings,
      selectedFlowId
    })

    if (nextSelectedFlowId !== selectedFlowId) {
      commitSelectedFlowId(nextSelectedFlowId)
    }
  }, [
    allowEmptySelection,
    client.id,
    client.recordings,
    isSelectionControlled,
    selectedFlowId
  ])

  const selectedFlow =
    client.recordings.find((recording) => recording.id === selectedFlowId) ?? client.recordings[0]
  const selectedFlowPathState = useMemo(
    () => getFlowPathState(selectedFlow, client.recordings, pathInput, t),
    [client.recordings, pathInput, selectedFlow, t]
  )

  useEffect(() => {
    setPathInput(selectedFlow?.path ?? '')
  }, [selectedFlow?.id, selectedFlow?.path])

  function updateRecordings(
    updater: (recordings: RouteClientConfig['recordings']) => RouteClientConfig['recordings']
  ) {
    onChange({
      ...client,
      recordings: updater(client.recordings)
    })
  }

  function updateSelectedFlow(patch: Partial<RouteClientRecording>) {
    if (!selectedFlow) {
      return
    }

    updateRecordings((recordings) =>
      recordings.map((item) =>
        item.id === selectedFlow.id
          ? {
              ...item,
              ...patch,
              updatedAt: new Date().toISOString()
            }
          : item
      )
    )
  }

  function addCodeFlow() {
    const now = new Date().toISOString()
    const nextFlow: RouteClientRecording = {
      id: createLocalId('flow'),
      path: createUniqueAssetPath(
        client.recordings.map((recording) => recording.path),
        '',
        'flow'
      ),
      name: t('options.assets.flows.newName'),
      description: '',
      mode: 'script',
      createdAt: now,
      updatedAt: now,
      capturedFeatures: [],
      steps: [],
      scriptSource: FLOW_SCRIPT_TEMPLATE
    }

    updateRecordings((recordings) => [nextFlow, ...recordings])
    commitSelectedFlowId(nextFlow.id)
  }

  function setSelectedMode(mode: RouteClientRecording['mode']) {
    if (!selectedFlow) {
      return
    }

    updateSelectedFlow({
      mode,
      ...(mode === 'script' && !selectedFlow.scriptSource.trim()
        ? { scriptSource: FLOW_SCRIPT_TEMPLATE }
        : {})
    })
  }

  function commitPath() {
    if (!selectedFlow) {
      return
    }

    const nextPath = normalizeEditableAssetPath(pathInput)

    setPathInput(nextPath || selectedFlow.path)

    if (!nextPath || nextPath === selectedFlow.path) {
      return
    }

    if (selectedFlowPathState.error) {
      return
    }

    updateSelectedFlow({ path: nextPath })
  }

  if (!selectedFlow) {
    return (
      <Stack spacing={1.25} alignItems="flex-start">
        <Typography variant="body2" color="text.secondary">
          {t('options.assets.flows.empty')}
        </Typography>
        <Button startIcon={<AddOutlined fontSize="small" />} onClick={addCodeFlow} variant="outlined">
          {t('options.assets.flows.addCode')}
        </Button>
      </Stack>
    )
  }

  return (
    <Stack spacing={1.25}>
      {!hideHeader ? (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t('options.assets.flows.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('options.assets.flows.description')}
            </Typography>
          </Box>
          <ToolbarIcon
            label={t('options.assets.flows.addCode')}
            onClick={addCodeFlow}
          >
            <AddOutlined fontSize="small" />
          </ToolbarIcon>
        </Stack>
      ) : null}

      {!hideList ? (
        <List
          dense
          disablePadding
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '12px',
            overflow: 'hidden'
          }}
        >
          {client.recordings.map((recording, index) => (
            <Box key={recording.id}>
              {index > 0 ? <Divider /> : null}
              <ListItem disablePadding>
                <ListItemButton
                  selected={selectedFlow.id === recording.id}
                  onClick={() => commitSelectedFlowId(recording.id)}
                >
                  <ListItemText
                    primary={recording.name}
                    secondary={
                      recording.mode === 'script'
                        ? t('options.assets.flows.mode.script')
                        : t('options.assets.flows.steps', {
                            count: recording.steps.length
                          })
                    }
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontWeight: 600,
                      noWrap: true
                    }}
                    secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                  />
                </ListItemButton>
              </ListItem>
            </Box>
          ))}
        </List>
      ) : null}

      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 1, alignItems: 'start' }}>
        <TextField
          size="small"
          label={t('options.assets.flows.name')}
          value={selectedFlow.name}
          onChange={(event) => updateSelectedFlow({ name: event.target.value })}
        />
      </Box>

      <TextField
        error={selectedFlowPathState.error}
        helperText={
          selectedFlowPathState.error
            ? selectedFlowPathState.helperText
            : undefined
        }
        size="small"
        label={t('options.assets.path')}
        value={pathInput}
        onBlur={commitPath}
        onChange={(event) => setPathInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commitPath()
          }
        }}
      />

      <TextField
        size="small"
        label={t('common.description')}
        value={selectedFlow.description}
        onChange={(event) => updateSelectedFlow({ description: event.target.value })}
      />

      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={selectedFlow.mode}
          onChange={(_event, next) => setSelectedMode(next)}
          variant="scrollable"
          scrollButtons={false}
        >
          <Tab value="recording" label={t('options.assets.flows.mode.recording')} />
          <Tab value="script" label={t('options.assets.flows.mode.script')} />
        </Tabs>
      </Box>

      {selectedFlow.mode === 'recording' ? (
        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary">
            {[
              t('options.assets.flows.steps', { count: selectedFlow.steps.length }),
              selectedFlow.startUrl
                ? `${t('options.assets.flows.startUrl')}: ${formatSurfaceUrlLabel(selectedFlow.startUrl)}`
                : undefined,
              selectedFlow.capturedFeatures.length
                ? `${t('options.assets.flows.features')}: ${selectedFlow.capturedFeatures.length}`
                : undefined
            ]
              .filter(Boolean)
              .join(' · ')}
          </Typography>

          {selectedFlow.steps.length > 0 ? (
            <List
              dense
              disablePadding
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '12px',
                overflow: 'hidden'
              }}
            >
              {selectedFlow.steps.map((step, index) => (
                <Box key={step.id}>
                  {index > 0 ? <Divider /> : null}
                  <ListItem sx={{ px: 1.25, py: 0.75 }}>
                    <ListItemText
                      primary={`${index + 1}. ${step.type}`}
                      secondary={[step.selector, step.value ?? step.key ?? step.text].filter(Boolean).join(' · ')}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                      secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                    />
                  </ListItem>
                </Box>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('options.assets.flows.recordingEmpty')}
            </Typography>
          )}
        </Stack>
      ) : (
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            {t('options.assets.flows.scriptHelp')}
          </Typography>
          <MonacoCodeEditor
            ariaLabel={t('options.assets.flows.scriptEditor')}
            language="javascript"
            minHeight={320}
            modelUri={`inmemory://modeldriveprotocol/chrome-extension/route-client/${encodeURIComponent(client.id)}/flow/${encodeURIComponent(selectedFlow.id)}.js`}
            onChange={(nextValue) => updateSelectedFlow({ scriptSource: nextValue })}
            options={{
              formatOnPaste: true,
              formatOnType: true,
              wordWrap: 'off'
            }}
            value={selectedFlow.scriptSource}
          />
        </Stack>
      )}
    </Stack>
  )
}

function getFlowPathState(
  selectedFlow: RouteClientRecording | undefined,
  recordings: RouteClientRecording[],
  pathInput: string,
  t: (key: string) => string
): {
  error: boolean
  helperText?: string
} {
  if (!selectedFlow) {
    return { error: false }
  }

  const normalizedPath = normalizeEditableAssetPath(pathInput)

  if (!normalizedPath) {
    return {
      error: true,
      helperText: t('options.assets.pathInvalid')
    }
  }

  const folderPaths = new Set(
    recordings
      .filter((recording) => recording.id !== selectedFlow.id)
      .flatMap((recording) => listAncestorFolders(recording.path))
  )

  if (
    recordings.some(
      (recording) =>
        recording.id !== selectedFlow.id &&
        normalizeEditableAssetPath(recording.path) === normalizedPath
    ) ||
    folderPaths.has(normalizedPath)
  ) {
    return {
      error: true,
      helperText: t('options.assets.pathConflict')
    }
  }

  return {
    error: false
  }
}

function getNextSelectedFlowId({
  allowEmptySelection,
  recordings,
  selectedFlowId
}: {
  allowEmptySelection: boolean
  recordings: RouteClientRecording[]
  selectedFlowId: string | undefined
}): string | undefined {
  if (
    selectedFlowId &&
    recordings.some((recording) => recording.id === selectedFlowId)
  ) {
    return selectedFlowId
  }

  if (allowEmptySelection) {
    return undefined
  }

  return recordings[0]?.id
}

function createUniqueAssetPath(
  existingPaths: string[],
  parentPath: string,
  baseName: string
): string {
  const normalizedParent = splitAssetPath(parentPath).join('/')
  const normalizedExistingPaths = new Set(
    existingPaths.map((path) => splitAssetPath(path).join('/'))
  )
  let attempt = 1

  while (true) {
    const suffix = attempt === 1 ? baseName : `${baseName}-${attempt}`
    const candidate = normalizedParent
      ? `${normalizedParent}/${suffix}`
      : suffix

    if (!normalizedExistingPaths.has(candidate)) {
      return candidate
    }

    attempt += 1
  }
}

function normalizeEditableAssetPath(path: string): string {
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

function splitAssetPath(path: string): string[] {
  return normalizeEditableAssetPath(path)
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function listAncestorFolders(path: string): string[] {
  const segments = splitAssetPath(path)
  const folders: string[] = []

  for (let index = 1; index < segments.length; index += 1) {
    folders.push(segments.slice(0, index).join('/'))
  }

  return folders
}
