import { Box, Typography } from '@mui/material'

export function SummaryGrid({
  columns = {
    xs: 'repeat(2, minmax(0, 1fr))',
    md: 'repeat(4, minmax(0, 1fr))'
  },
  items
}: {
  columns?: Record<string, string>
  items: Array<{
    label: string
    value: string
    tone?: string
  }>
}) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: columns, gap: 1 }}>
      {items.map((item) => (
        <Box
          key={item.label}
          sx={{
            px: 1.25,
            py: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '12px',
            bgcolor: 'background.paper'
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {item.label}
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, color: item.tone ?? 'text.primary' }}
          >
            {item.value}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}
