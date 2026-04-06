import { Box, List, Typography } from '@mui/material'
import type { BoxProps } from '@mui/material'
import type { ReactNode } from 'react'

export function InvocationSectionTitle({
  children
}: {
  children: ReactNode
}) {
  return (
    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
      {children}
    </Typography>
  )
}

export function InvocationSurface({
  children,
  sx,
  ...props
}: BoxProps) {
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '4px',
        bgcolor: 'background.paper',
        ...sx
      }}
      {...props}
    >
      {children}
    </Box>
  )
}

export function InvocationListSurface({
  children
}: {
  children: ReactNode
}) {
  return (
    <List
      disablePadding
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '4px',
        bgcolor: 'background.paper',
        overflow: 'hidden'
      }}
    >
      {children}
    </List>
  )
}
