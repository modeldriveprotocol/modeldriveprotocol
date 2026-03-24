import AddOutlined from '@mui/icons-material/AddOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import { Box, Button, Divider, List, ListItem, ListItemButton, ListItemText, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'

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
  onChange
}: {
  client: RouteClientConfig
  onChange: (next: RouteClientConfig) => void
}) {
  const { t } = useI18n()
  const [selectedFlowId, setSelectedFlowId] = useState<string>()

  useEffect(() => {
    setSelectedFlowId((current) =>
      current && client.recordings.some((recording) => recording.id === current)
        ? current
        : client.recordings[0]?.id
    )
  }, [client.id, client.recordings])

  const selectedFlow =
    client.recordings.find((recording) => recording.id === selectedFlowId) ?? client.recordings[0]

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
    setSelectedFlowId(nextFlow.id)
  }

  function removeSelectedFlow() {
    if (!selectedFlow) {
      return
    }

    updateRecordings((recordings) => recordings.filter((item) => item.id !== selectedFlow.id))
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
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {t('options.assets.flows.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('options.assets.flows.description')}
          </Typography>
        </Box>
        <ToolbarIcon label={t('options.assets.flows.addCode')} onClick={addCodeFlow}>
          <AddOutlined fontSize="small" />
        </ToolbarIcon>
      </Stack>

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
                onClick={() => setSelectedFlowId(recording.id)}
              >
                <ListItemText
                  primary={recording.name}
                  secondary={
                    recording.mode === 'script'
                      ? t('options.assets.flows.mode.script')
                      : t('options.assets.flows.steps', { count: recording.steps.length })
                  }
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
                  secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                />
              </ListItemButton>
            </ListItem>
          </Box>
        ))}
      </List>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 1, alignItems: 'start' }}>
        <TextField
          size="small"
          label={t('options.assets.flows.name')}
          value={selectedFlow.name}
          onChange={(event) => updateSelectedFlow({ name: event.target.value })}
        />
        <ToolbarIcon label={t('options.assets.deleteItem')} onClick={removeSelectedFlow}>
          <DeleteOutlineOutlined fontSize="small" />
        </ToolbarIcon>
      </Box>

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
