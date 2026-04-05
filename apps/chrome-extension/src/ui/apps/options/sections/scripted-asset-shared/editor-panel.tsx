import {
  Box,
  Breadcrumbs,
  Divider,
  Stack,
  Typography,
  type SxProps,
  type Theme as MuiTheme
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { ReactNode } from 'react'

import { MonacoCodeEditor } from '../../../../foundation/monaco-editor.js'

export function ScriptedAssetEditorPanel({
  breadcrumbPath,
  controls,
  descriptionLabel,
  descriptionPlaceholder,
  descriptionValue,
  editorLabel,
  editorLanguage,
  editorMinHeight = 360,
  editorModelUri,
  editorPlaceholder,
  editorValue,
  sx,
  onDescriptionChange,
  onEditorChange
}: {
  breadcrumbPath?: string
  controls?: ReactNode
  descriptionLabel: string
  descriptionPlaceholder?: string
  descriptionValue: string
  editorLabel: string
  editorLanguage: 'javascript' | 'markdown'
  editorMinHeight?: number
  editorModelUri: string
  editorPlaceholder?: string
  editorValue: string
  sx?: SxProps<MuiTheme>
  onDescriptionChange: (value: string) => void
  onEditorChange: (value: string) => void
}) {
  const alignedEditorGutterOptions = {
    glyphMargin: false,
    lineNumbers: 'on' as const,
    lineNumbersMinChars: 3
  }
  const breadcrumbSegments = getBreadcrumbSegments(breadcrumbPath)

  return (
    <Stack spacing={0.75} sx={{ minHeight: 0, flex: 1, ...sx }}>
      {controls}
      <Box
        sx={{
          minHeight: 0,
          flex: 1,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {breadcrumbSegments.length > 0 ? (
          <>
            <Box
              sx={{
                minHeight: 32,
                px: 1.25,
                display: 'flex',
                alignItems: 'center',
                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Breadcrumbs
                aria-label="asset path"
                separator={
                  <Typography
                    component="span"
                    sx={{ color: 'text.disabled', fontSize: 12 }}
                  >
                    ›
                  </Typography>
                }
                sx={{
                  '& .MuiBreadcrumbs-separator': {
                    mx: 0.5
                  }
                }}
              >
                {breadcrumbSegments.map((segment, index) => (
                  <Typography
                    key={`${segment}-${index}`}
                    noWrap
                    sx={{
                      maxWidth: 220,
                      fontSize: 12,
                      lineHeight: 1.5,
                      fontFamily:
                        'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace',
                      color:
                        index === breadcrumbSegments.length - 1
                          ? 'text.primary'
                          : 'text.secondary',
                      fontWeight: index === breadcrumbSegments.length - 1 ? 600 : 500
                    }}
                  >
                    {segment}
                  </Typography>
                ))}
              </Breadcrumbs>
            </Box>
            <Divider />
          </>
        ) : null}
        <Box sx={{ height: 112, minHeight: 112 }}>
          <MonacoCodeEditor
            ariaLabel={descriptionLabel}
            height={112}
            language="markdown"
            minHeight={112}
            modelUri={`${editorModelUri}.description.md`}
            onChange={(nextValue: string | undefined) =>
              onDescriptionChange(nextValue ?? '')
            }
            options={{
              ...alignedEditorGutterOptions,
              wordWrap: 'on'
            }}
            placeholder={descriptionPlaceholder}
            value={descriptionValue}
          />
        </Box>
        <Divider />
        <Box sx={{ minHeight: 0, flex: 1 }}>
          <MonacoCodeEditor
            ariaLabel={editorLabel}
            height="100%"
            language={editorLanguage}
            minHeight={editorMinHeight}
            modelUri={editorModelUri}
            onChange={(nextValue: string | undefined) =>
              onEditorChange(nextValue ?? '')
            }
            options={alignedEditorGutterOptions}
            placeholder={editorPlaceholder}
            value={editorValue}
          />
        </Box>
      </Box>
    </Stack>
  )
}

function getBreadcrumbSegments(path: string | undefined): string[] {
  if (!path) {
    return []
  }

  return path
    .split('/')
    .filter(Boolean)
}
