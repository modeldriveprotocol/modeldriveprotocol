import { Box, FormControlLabel, Switch, TextField } from '@mui/material'

import type {
  BackgroundClientConfig,
  ClientIconKey
} from '#~/shared/config.js'
import { IconPicker } from '../../icon-picker.js'

export function BackgroundClientBasicsTab({
  client,
  disabled,
  labels,
  onChange
}: {
  client: BackgroundClientConfig
  disabled: boolean
  labels: {
    enabled: string
    type: string
    backgroundType: string
    icon: string
    clientName: string
    clientId: string
    description: string
  }
  onChange: (next: BackgroundClientConfig) => void
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 1.25
      }}
    >
      <FormControlLabel
        control={
          <Switch
            checked={client.enabled}
            disabled={disabled}
            onChange={(_, checked) => onChange({ ...client, enabled: checked })}
          />
        }
        label={labels.enabled}
      />
      <TextField size="small" label={labels.type} value={labels.backgroundType} disabled />
      <IconPicker
        label={labels.icon}
        value={client.icon}
        onChange={(icon: ClientIconKey) => onChange({ ...client, icon })}
      />
      <TextField
        size="small"
        label={labels.clientName}
        value={client.clientName}
        onChange={(event) => onChange({ ...client, clientName: event.target.value })}
      />
      <TextField
        size="small"
        label={labels.clientId}
        value={client.clientId}
        disabled={disabled}
        onChange={(event) => onChange({ ...client, clientId: event.target.value })}
      />
      <TextField
        size="small"
        label={labels.description}
        value={client.clientDescription}
        onChange={(event) =>
          onChange({ ...client, clientDescription: event.target.value })
        }
        multiline
        minRows={3}
        sx={{ gridColumn: '1 / -1' }}
      />
    </Box>
  )
}
