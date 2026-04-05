import { Box } from '@mui/material'
import { alpha, useTheme, type Theme } from '@mui/material/styles'

export function HttpMethodBadge({
  fallback = 'M',
  method
}: {
  fallback?: string
  method?: string
}) {
  const theme = useTheme()
  const label = method?.slice(0, 1).toUpperCase() ?? fallback
  const tone = getMethodBadgeTone(theme, method)

  return (
    <Box
      sx={{
        width: 18,
        height: 18,
        borderRadius: 0.75,
        border: '1px solid',
        borderColor: alpha(tone.accent, 0.4),
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 700,
        color: tone.accent,
        bgcolor: tone.background,
        flexShrink: 0
      }}
    >
      {label}
    </Box>
  )
}

function getMethodBadgeTone(
  theme: Theme,
  method: string | undefined
) {
  switch (method) {
    case 'GET':
      return {
        accent: theme.palette.success.main,
        background: alpha(theme.palette.success.main, 0.14)
      }
    case 'POST':
      return {
        accent: theme.palette.warning.dark,
        background: alpha(theme.palette.warning.main, 0.18)
      }
    case 'PUT':
      return {
        accent: theme.palette.info.main,
        background: alpha(theme.palette.info.main, 0.16)
      }
    case 'PATCH':
      return {
        accent: theme.palette.primary.main,
        background: alpha(theme.palette.primary.main, 0.14)
      }
    case 'DELETE':
      return {
        accent: theme.palette.error.main,
        background: alpha(theme.palette.error.main, 0.14)
      }
    default:
      return {
        accent: theme.palette.text.secondary,
        background: alpha(theme.palette.text.secondary, 0.12)
      }
  }
}
