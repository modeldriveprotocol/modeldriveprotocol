import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined'
import FiberManualRecordOutlined from '@mui/icons-material/FiberManualRecordOutlined'
import FolderOutlined from '@mui/icons-material/FolderOutlined'
import HubOutlined from '@mui/icons-material/HubOutlined'
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined'
import PlayArrowOutlined from '@mui/icons-material/PlayArrowOutlined'
import WebOutlined from '@mui/icons-material/WebOutlined'
import { Alert, Button, IconButton, List, ListItem, ListItemText, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { useMemo } from 'react'

import { clearPendingSelectorCapture, injectBridge, openOptionsSection, runRecording, startRecording, startSelectorCapture, stopRecording } from '../../platform/extension-api.js'
import { SidepanelAssetPreview } from './client-asset-preview.js'
import {
  createRouteAssetPreviewEntries,
  getPreferredPreviewPath,
  ROOT_ROUTE_SKILL_PATH
} from './client-asset-preview-model.js'
import { ClientPanelShell } from './client-panel-shell.js'
import { ConnectionStateIndicator } from './connection-state-indicator.js'
import { ActionIcon } from './action-icon.js'
import type { SidepanelController, SidepanelClientEntry } from './types.js'

export function RouteClientPanel({
  controller,
  expanded,
  item,
  onExpandedChange
}: {
  controller: SidepanelController
  expanded: boolean
  item: SidepanelClientEntry
  onExpandedChange: (expanded: boolean) => void
}) {
  const client = item.client
  const routeConfig = controller.state?.config.routeClients.find((entry) => entry.id === client.id)
  const isRecordingClient = controller.state?.activeRecording?.routeClientId === client.id
  const isCapturingSelector = controller.state?.pendingSelectorCapture?.routeClientId === client.id
  const primaryAction = controller.buildRouteClientPrimaryAction(client)
  const assetEntries = useMemo(
    () => (routeConfig ? createRouteAssetPreviewEntries(routeConfig) : []),
    [routeConfig]
  )

  return (
    <ClientPanelShell
      collapseLabel={controller.t('common.collapse')}
      expandLabel={controller.t('common.expand')}
      expanded={expanded}
      onChange={(expanded) => {
        onExpandedChange(expanded)
        if (expanded) {
          controller.setSelectedClientId(client.id)
        }
      }}
      icon={client.icon}
      iconBadge={(
        <ConnectionStateIndicator state={client.connectionState} t={controller.t} />
      )}
      titlePrefix={(
        <Tooltip title={controller.t('popup.section.currentPage')}>
          <WebOutlined fontSize="inherit" />
        </Tooltip>
      )}
      title={client.clientName}
      onTitleClick={() => void openOptionsSection('clients', { clientId: client.id })}
    >
      <Stack spacing={1.25}>
        <SidepanelAssetPreview
          entries={assetEntries}
          preferredPath={getPreferredPreviewPath(assetEntries, ROOT_ROUTE_SKILL_PATH)}
          emptyLabel={controller.t('popup.noExposedAssets')}
          pathLabel={controller.t('common.path')}
        />
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Button size="small" variant="contained" startIcon={primaryAction.icon} onClick={primaryAction.onClick}>{primaryAction.label}</Button>
          <Stack direction="row" spacing={0.5}>
            {primaryAction.kind !== 'record' && primaryAction.kind !== 'stop' ? (
              <ActionIcon
                label={isRecordingClient ? controller.t('popup.stopRecording') : controller.t('popup.recordFlow')}
                onClick={() => void controller.runAction(isRecordingClient ? controller.t('popup.recordingSaved') : controller.t('popup.recordingStarted'), async () => {
                  if (isRecordingClient) {
                    await stopRecording(controller.recordingName.trim(), controller.recordingDescription.trim())
                    controller.setRecordingName('')
                    controller.setRecordingDescription('')
                    return
                  }
                  await startRecording(client.id)
                }, isRecordingClient ? { suggestSelectedClientPrimary: true } : undefined)}
              >
                <FiberManualRecordOutlined fontSize="small" color={isRecordingClient ? 'error' : 'inherit'} />
              </ActionIcon>
            ) : null}
            {primaryAction.kind !== 'capture' ? (
              <ActionIcon label={controller.t('popup.captureResource')} onClick={() => void controller.runAction(controller.t('popup.selectorCaptureArmed'), async () => startSelectorCapture(client.id))}>
                <InsertDriveFileOutlined fontSize="small" />
              </ActionIcon>
            ) : null}
            {primaryAction.kind !== 'skill' && primaryAction.kind !== 'assets' ? (
              <ActionIcon label={controller.t('popup.addSkill')} onClick={() => void openOptionsSection('assets', { clientId: client.id, assetTab: 'skills' })}>
                <AutoAwesomeOutlined fontSize="small" />
              </ActionIcon>
            ) : null}
            {primaryAction.kind !== 'inject' && primaryAction.kind !== 'grant' ? (
              <ActionIcon label={controller.t('popup.injectBridge')} onClick={() => void controller.runAction(controller.t('popup.bridgeInjected'), async () => injectBridge(client.id), { suggestSelectedClientPrimary: true })}>
                <HubOutlined fontSize="small" />
              </ActionIcon>
            ) : null}
          </Stack>
        </Stack>

        {isRecordingClient ? (
          <Stack direction="row" spacing={1}>
            <TextField size="small" label={controller.t('popup.flowName')} value={controller.recordingName} onChange={(event) => controller.setRecordingName(event.target.value)} fullWidth />
            <TextField size="small" label={controller.t('common.summary')} value={controller.recordingDescription} onChange={(event) => controller.setRecordingDescription(event.target.value)} fullWidth />
          </Stack>
        ) : null}

        {isCapturingSelector ? (
          <Alert
            severity="success"
            action={
              <Tooltip title={controller.t('popup.dismiss')}>
                <IconButton size="small" onClick={() => void controller.runAction(controller.t('popup.selectorCaptureCleared'), async () => clearPendingSelectorCapture())}>
                  <FolderOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          >
            {controller.t('popup.capturedSelector', { selector: controller.state?.pendingSelectorCapture?.resource.selector ?? '' })}
          </Alert>
        ) : null}

        {routeConfig?.recordings?.length ? (
          <List dense disablePadding>
            {routeConfig.recordings.slice(0, 3).map((recording) => (
              <ListItem
                key={recording.id}
                disablePadding
                secondaryAction={
                  <Tooltip title={controller.t('popup.replayFlow')}>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => void controller.runAction(
                        controller.t('popup.replayedFlow'),
                        async () => {
                          if (client.id) {
                            await runRecording(client.id, recording.id)
                          }
                        },
                        { refresh: false }
                      )}
                    >
                      <PlayArrowOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                }
                sx={{ py: 0.25 }}
              >
                <ListItemText
                  primary={recording.name}
                  secondary={recording.mode === 'script'
                    ? controller.t('popup.flowCode')
                    : controller.t('popup.flowSteps', { count: recording.steps.length })}
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary">{controller.t('popup.noFlows')}</Typography>
        )}
      </Stack>
    </ClientPanelShell>
  )
}
