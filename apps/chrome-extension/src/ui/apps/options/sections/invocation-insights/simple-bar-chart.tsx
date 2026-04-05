import { Box, Stack, Typography } from '@mui/material'

import { formatBarValue } from './formatters.js'

export function SimpleBarChart({
  items,
  title
}: {
  items: Array<{
    key: string
    label: string
    value: number
    helper?: string
    onClick?: () => void
    tone?: string
  }>
  title: string
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1)

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '12px',
          p: 1.25,
          overflowX: 'auto'
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridAutoFlow: 'column',
            gridAutoColumns: 'minmax(44px, 1fr)',
            gap: 1,
            alignItems: 'end',
            minHeight: 160,
            minWidth: Math.max(items.length * 58, 240)
          }}
        >
          {items.map((item) => (
            <Stack
              key={item.key}
              component={item.onClick ? 'button' : 'div'}
              spacing={0.5}
              justifyContent="flex-end"
              onClick={item.onClick}
              sx={{
                minWidth: 0,
                height: '100%',
                border: 'none',
                bgcolor: 'transparent',
                p: 0,
                textAlign: 'inherit',
                cursor: item.onClick ? 'pointer' : 'default'
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textAlign: 'center' }}
              >
                {formatBarValue(item.value)}
              </Typography>
              <Box
                sx={{
                  height: `${Math.max(14, (item.value / maxValue) * 88)}px`,
                  borderRadius: '10px 10px 6px 6px',
                  bgcolor: item.tone ?? 'primary.main',
                  opacity: item.value === 0 ? 0.35 : 1
                }}
              />
              <Typography variant="caption" noWrap sx={{ textAlign: 'center' }}>
                {item.label}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                sx={{ textAlign: 'center' }}
              >
                {item.helper ?? ' '}
              </Typography>
            </Stack>
          ))}
        </Box>
      </Box>
    </Stack>
  )
}
