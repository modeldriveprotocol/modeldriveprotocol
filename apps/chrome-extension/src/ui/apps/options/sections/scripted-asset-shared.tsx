import {
  Box,
  ButtonBase,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
  type SxProps,
  type Theme as MuiTheme
} from '@mui/material'
import { alpha, useTheme, type Theme } from '@mui/material/styles'
import type { ReactNode } from 'react'

import { MonacoCodeEditor } from '../../../foundation/monaco-editor.js'

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

export type ScriptedAssetContextMenuSection = {
  key: string
  title: string
  items: Array<{
    key: string
    label: string
    icon?: ReactNode
    disabled?: boolean
    tone?: 'default' | 'danger'
    onSelect: () => void
  }>
}

export function ScriptedAssetContextMenu({
  anchorPosition,
  onClose,
  open,
  sections
}: {
  anchorPosition?: { left: number; top: number }
  onClose: () => void
  open: boolean
  sections: ScriptedAssetContextMenuSection[]
}) {
  const visibleSections = sections.filter((section) => section.items.length > 0)

  return (
    <Menu
      anchorPosition={anchorPosition}
      anchorReference="anchorPosition"
      MenuListProps={{
        disablePadding: true,
        sx: { py: 0 }
      }}
      onClose={onClose}
      open={open}
      PaperProps={{
        sx: {
          py: 0,
          minWidth: 220
        }
      }}
    >
      {visibleSections.map((section, index) => (
        <Box key={section.key}>
          {index > 0 ? <Divider /> : null}
          <Typography
            variant="overline"
            sx={{
              display: 'block',
              px: 1.5,
              pt: 0.75,
              pb: 0.25,
              color: 'text.secondary',
              lineHeight: 1.6
            }}
          >
            {section.title}
          </Typography>
          {section.items.map((item) => (
            <MenuItem
              key={item.key}
              dense
              disabled={item.disabled}
              onClick={() => {
                onClose()
                item.onSelect()
              }}
              sx={{
                minHeight: 34,
                py: 0.75,
                color:
                  item.tone === 'danger' && !item.disabled
                    ? 'error.main'
                    : undefined
              }}
            >
              {item.icon ? <ListItemIcon>{item.icon}</ListItemIcon> : null}
              <ListItemText>{item.label}</ListItemText>
            </MenuItem>
          ))}
        </Box>
      ))}
    </Menu>
  )
}

export function ScriptedAssetEditorPanel({
  controls,
  descriptionLabel,
  descriptionValue,
  editorLabel,
  editorLanguage,
  editorMinHeight = 360,
  editorModelUri,
  editorValue,
  onDescriptionChange,
  onEditorChange
}: {
  controls?: ReactNode
  descriptionLabel: string
  descriptionValue: string
  editorLabel: string
  editorLanguage: 'javascript' | 'markdown'
  editorMinHeight?: number
  editorModelUri: string
  editorValue: string
  onDescriptionChange: (value: string) => void
  onEditorChange: (value: string) => void
}) {
  return (
    <Stack spacing={0.75} sx={{ minHeight: 0, flex: 1 }}>
      {controls}
      <Box
        sx={{
          minHeight: 0,
          flex: 1,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box sx={{ height: 112, minHeight: 112 }}>
          <MonacoCodeEditor
            ariaLabel={descriptionLabel}
            height={112}
            language="markdown"
            minHeight={112}
            modelUri={`${editorModelUri}.description.md`}
            onChange={(nextValue) => onDescriptionChange(nextValue ?? '')}
            options={{
              folding: false,
              glyphMargin: false,
              lineDecorationsWidth: 0,
              lineNumbers: 'off',
              lineNumbersMinChars: 0,
              overviewRulerBorder: false,
              overviewRulerLanes: 0,
              wordWrap: 'on'
            }}
            value={descriptionValue}
          />
        </Box>
        <Divider />
        <Box sx={{ minHeight: 0, flex: 1 }}>
          <MonacoCodeEditor
            ariaLabel={editorLabel}
            language={editorLanguage}
            minHeight={editorMinHeight}
            modelUri={editorModelUri}
            onChange={(nextValue) => onEditorChange(nextValue ?? '')}
            value={editorValue}
          />
        </Box>
      </Box>
    </Stack>
  )
}

export function ScriptedAssetMethodField({
  label,
  method,
  sx,
  onChange
}: {
  label: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  sx?: SxProps<MuiTheme>
  onChange: (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE') => void
}) {
  return (
    <TextField
      select
      size="small"
      label={label}
      sx={{
        ...sx,
        '& .MuiInputLabel-root': {
          fontSize: 13
        },
        '& .MuiOutlinedInput-root': {
          minHeight: 34,
          borderRadius: 1.25
        },
        '& .MuiSelect-select': {
          fontSize: 13,
          py: 0.75
        },
        '& .MuiSvgIcon-root': {
          fontSize: 18
        }
      }}
      value={method}
      onChange={(event) =>
        onChange(
          event.target.value as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
        )
      }
    >
      <MenuItem sx={{ fontSize: 13, minHeight: 34 }} value="GET">GET</MenuItem>
      <MenuItem sx={{ fontSize: 13, minHeight: 34 }} value="POST">POST</MenuItem>
      <MenuItem sx={{ fontSize: 13, minHeight: 34 }} value="PUT">PUT</MenuItem>
      <MenuItem sx={{ fontSize: 13, minHeight: 34 }} value="PATCH">PATCH</MenuItem>
      <MenuItem sx={{ fontSize: 13, minHeight: 34 }} value="DELETE">DELETE</MenuItem>
    </TextField>
  )
}

export type ScriptedAssetEnabledState = 'enabled' | 'disabled' | 'mixed'

export function ScriptedAssetEnabledButton({
  disabled = false,
  onClick,
  state
}: {
  disabled?: boolean
  onClick: () => void
  state: ScriptedAssetEnabledState
}) {
  const theme = useTheme()
  const tone = getEnabledButtonTone(theme, state)

  return (
    <ButtonBase
      aria-label={
        state === 'enabled'
          ? 'Disable'
          : state === 'disabled'
            ? 'Enable'
            : 'Enable all'
      }
      disabled={disabled}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClick()
      }}
      sx={{
        width: 18,
        height: 18,
        minWidth: 18,
        borderRadius: '50%',
        border: '2px solid',
        borderColor: tone.ring,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        opacity: disabled ? 0.45 : 1
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: tone.dot
        }}
      />
    </ButtonBase>
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

function getEnabledButtonTone(
  theme: Theme,
  state: ScriptedAssetEnabledState
) {
  switch (state) {
    case 'enabled':
      return {
        ring: theme.palette.success.main,
        dot: theme.palette.success.main
      }
    case 'mixed':
      return {
        ring: theme.palette.warning.main,
        dot: alpha(theme.palette.warning.main, 0.92)
      }
    default:
      return {
        ring: theme.palette.error.main,
        dot: 'transparent'
      }
  }
}
