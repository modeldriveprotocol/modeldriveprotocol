import { Autocomplete, Box, TextField, Typography } from '@mui/material'

import type { ClientIconKey } from '#~/shared/config.js'
import { getClientIconLabel, renderClientIcon } from '../../foundation/client-icons.js'
import { ICON_OPTIONS } from './types.js'

export function IconPicker({
  label,
  onChange,
  value
}: {
  label: string
  onChange: (icon: ClientIconKey) => void
  value: ClientIconKey
}) {
  return (
    <Autocomplete<ClientIconKey, false, false, false>
      options={ICON_OPTIONS}
      value={value}
      onChange={(_event, nextValue) => {
        if (nextValue) {
          onChange(nextValue)
        }
      }}
      getOptionLabel={(option) => getClientIconLabel(option)}
      isOptionEqualToValue={(option, currentValue) => option === currentValue}
      renderOption={(props, option) => (
        <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ color: 'text.secondary', display: 'grid', placeItems: 'center' }}>
            {renderClientIcon(option)}
          </Box>
          <Typography variant="body2">{getClientIconLabel(option)}</Typography>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label={label}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                <Box sx={{ color: 'text.secondary', display: 'grid', placeItems: 'center', mr: 1 }}>
                  {renderClientIcon(value)}
                </Box>
                {params.InputProps.startAdornment}
              </>
            )
          }}
        />
      )}
    />
  )
}
