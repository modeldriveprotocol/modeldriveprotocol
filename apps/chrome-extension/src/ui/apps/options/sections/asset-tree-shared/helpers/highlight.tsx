import { Box } from '@mui/material'
import type { ReactNode } from 'react'

export function renderHighlightedText(text: string, searchTerm?: string) {
  const needle = searchTerm?.trim()

  if (!needle) {
    return text
  }

  const lowerText = text.toLocaleLowerCase()
  const lowerNeedle = needle.toLocaleLowerCase()

  if (!lowerText.includes(lowerNeedle)) {
    return text
  }

  const segments: ReactNode[] = []
  let cursor = 0
  let matchIndex = lowerText.indexOf(lowerNeedle, cursor)

  while (matchIndex !== -1) {
    if (matchIndex > cursor) {
      segments.push(text.slice(cursor, matchIndex))
    }

    const endIndex = matchIndex + needle.length
    segments.push(
      <Box
        component="span"
        key={`${matchIndex}-${endIndex}`}
        sx={{
          bgcolor: 'action.selected',
          borderRadius: 0.5,
          px: 0.25
        }}
      >
        {text.slice(matchIndex, endIndex)}
      </Box>
    )
    cursor = endIndex
    matchIndex = lowerText.indexOf(lowerNeedle, cursor)
  }

  if (cursor < text.length) {
    segments.push(text.slice(cursor))
  }

  return segments
}
