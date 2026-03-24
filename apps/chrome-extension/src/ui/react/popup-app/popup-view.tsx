import { Alert, Button, Stack, Typography } from '@mui/material'

import type { PopupController } from './types.js'
import { PopupClientsPanel } from './popup-clients-panel.js'
import { PopupHeader } from './popup-header.js'
import { QuickCreatePanel } from './quick-create-panel.js'

export function PopupView({ controller }: { controller: PopupController }) {
  return (
    <Stack spacing={1.25}>
      <PopupHeader controller={controller} />
      {controller.flash ? <Alert severity="success" action={controller.successFollowUpAction ? <Button color="inherit" size="small" onClick={controller.successFollowUpAction.onClick} startIcon={controller.successFollowUpAction.icon}>{controller.successFollowUpAction.label}</Button> : undefined}>{controller.flash.message}</Alert> : null}
      {controller.error ? <Alert severity="error" action={controller.errorRecoveryAction ? <Button color="inherit" size="small" onClick={controller.errorRecoveryAction.onClick}>{controller.errorRecoveryAction.label}</Button> : undefined}>{controller.error}</Alert> : null}
      {controller.loading ? <Alert severity="info">{controller.t('common.loading')}</Alert> : null}
      <PopupClientsPanel controller={controller} />
      <QuickCreatePanel controller={controller} />
      <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>{controller.t('popup.footer')}</Typography>
    </Stack>
  )
}
