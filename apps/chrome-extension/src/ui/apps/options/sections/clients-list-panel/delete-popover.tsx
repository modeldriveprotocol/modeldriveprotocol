import { Button, Popover, Stack, Typography } from '@mui/material'

import type { DeleteConfirmationState } from './types.js'

export function ClientsDeletePopover({
  confirmation,
  description,
  onCancel,
  onConfirm,
  t
}: {
  confirmation: DeleteConfirmationState | undefined
  description: string
  onCancel: () => void
  onConfirm: () => void
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  return (
    <Popover
      open={Boolean(confirmation)}
      anchorEl={confirmation?.anchorEl ?? null}
      onClose={onCancel}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Stack spacing={1} sx={{ p: 1.25, maxWidth: 280 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t('options.clients.confirmDelete.title')}
        </Typography>
        <Typography variant="body2">{description}</Typography>
        <Typography variant="caption" color="text.secondary">
          {t('options.clients.confirmDelete.hint')}
        </Typography>
        <Stack
          direction="row"
          justifyContent="flex-end"
          spacing={1}
          sx={{ pt: 0.5 }}
        >
          <Button size="small" onClick={onCancel}>
            {t('options.clients.confirmDelete.cancel')}
          </Button>
          <Button size="small" color="error" variant="contained" onClick={onConfirm}>
            {t('options.clients.confirmDelete.confirm')}
          </Button>
        </Stack>
      </Stack>
    </Popover>
  )
}
