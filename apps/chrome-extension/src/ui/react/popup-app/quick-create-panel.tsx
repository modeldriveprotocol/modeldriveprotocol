import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined'
import FiberManualRecordOutlined from '@mui/icons-material/FiberManualRecordOutlined'
import FolderOutlined from '@mui/icons-material/FolderOutlined'
import HubOutlined from '@mui/icons-material/HubOutlined'
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined'
import SmartToyOutlined from '@mui/icons-material/SmartToyOutlined'
import { Alert, Box, IconButton, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material'

import { clearPendingSelectorCapture, injectBridge, openOptionsSection, startRecording, startSelectorCapture, stopRecording } from '../extension-api.js'
import { ActionIcon } from './action-icon.js'
import type { PopupController } from './types.js'

export function QuickCreatePanel({ controller }: { controller: PopupController }) {
  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', px: 1.5, py: 1.25 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <SmartToyOutlined fontSize="small" color="primary" />
          <Box>
            <Typography variant="subtitle2">{controller.t('popup.quickCreateTitle')}</Typography>
            <Typography variant="body2" color="text.secondary">{controller.t('popup.quickCreateDescription')}</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <ActionIcon label={controller.state?.activeRecording ? controller.t('popup.stopRecording') : controller.t('popup.recordFlow')} disabled={!controller.selectedClient?.id} onClick={() => void controller.runAction(controller.state?.activeRecording ? controller.t('popup.recordingSaved') : controller.t('popup.recordingStarted'), async () => {
            if (controller.state?.activeRecording) {
              await stopRecording(controller.recordingName.trim(), controller.recordingDescription.trim())
              controller.setRecordingName('')
              controller.setRecordingDescription('')
              return
            }
            await startRecording(controller.selectedClient?.id)
          })}>
            <FiberManualRecordOutlined fontSize="small" color={controller.state?.activeRecording ? 'error' : 'inherit'} />
          </ActionIcon>
          <ActionIcon label={controller.t('popup.captureResource')} disabled={!controller.selectedClient?.id} onClick={() => void controller.runAction(controller.t('popup.selectorCaptureArmed'), async () => startSelectorCapture(controller.selectedClient?.id))}>
            <InsertDriveFileOutlined fontSize="small" />
          </ActionIcon>
          <ActionIcon label={controller.t('popup.addSkill')} disabled={!controller.selectedClient?.id} onClick={() => void openOptionsSection('assets', { clientId: controller.selectedClient?.id, assetTab: 'skills' })}>
            <AutoAwesomeOutlined fontSize="small" />
          </ActionIcon>
          <ActionIcon label={controller.t('popup.injectBridge')} disabled={!controller.selectedClient?.id} onClick={() => void controller.runAction(controller.t('popup.bridgeInjected'), async () => injectBridge(controller.selectedClient?.id), { suggestSelectedClientPrimary: true })}>
            <HubOutlined fontSize="small" />
          </ActionIcon>
        </Stack>
      </Stack>

      {controller.state?.activeRecording ? (
        <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
          <TextField size="small" label={controller.t('popup.flowName')} value={controller.recordingName} onChange={(event) => controller.setRecordingName(event.target.value)} fullWidth />
          <TextField size="small" label={controller.t('common.summary')} value={controller.recordingDescription} onChange={(event) => controller.setRecordingDescription(event.target.value)} fullWidth />
        </Stack>
      ) : null}

      {controller.state?.pendingSelectorCapture ? (
        <Alert
          sx={{ mt: 1.25 }}
          severity="success"
          action={
            <Tooltip title={controller.t('popup.dismiss')}>
              <IconButton size="small" onClick={() => void controller.runAction(controller.t('popup.selectorCaptureCleared'), async () => clearPendingSelectorCapture())}>
                <FolderOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          }
        >
          {controller.t('popup.capturedSelector', { selector: controller.state.pendingSelectorCapture.resource.selector })}
        </Alert>
      ) : null}
    </Paper>
  )
}
