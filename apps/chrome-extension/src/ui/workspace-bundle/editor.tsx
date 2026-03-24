import { Box, useTheme } from '@mui/material'
import { useEffect, useRef } from 'react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import 'monaco-editor/esm/vs/language/json/monaco.contribution'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

import {
  WORKSPACE_BUNDLE_SCHEMA_URI,
  workspaceBundleJsonSchema
} from './schema.js'

declare global {
  var MonacoEnvironment:
    | {
        getWorker: (_moduleId: string, label: string) => Worker
      }
    | undefined
}

const WORKSPACE_BUNDLE_MODEL_URI = monaco.Uri.parse(
  'inmemory://modeldriveprotocol/chrome-extension/workspace-bundle.json'
)
const LIGHT_THEME_NAME = 'mdp-workspace-json-light'
const DARK_THEME_NAME = 'mdp-workspace-json-dark'

let monacoBootstrapped = false

function ensureMonacoBootstrapped() {
  if (monacoBootstrapped) {
    return
  }

  const jsonDefaults = (
    monaco.languages as typeof monaco.languages & {
      json: {
        jsonDefaults: {
          setDiagnosticsOptions: (options: unknown) => void
        }
      }
    }
  ).json.jsonDefaults

  globalThis.MonacoEnvironment = {
    getWorker(_moduleId, label) {
      if (label === 'json') {
        return new jsonWorker()
      }

      return new editorWorker()
    }
  }

  jsonDefaults.setDiagnosticsOptions({
    allowComments: false,
    enableSchemaRequest: false,
    schemaValidation: 'warning',
    validate: true,
    schemas: [
      {
        uri: WORKSPACE_BUNDLE_SCHEMA_URI,
        fileMatch: [WORKSPACE_BUNDLE_MODEL_URI.toString()],
        schema: workspaceBundleJsonSchema
      }
    ]
  })

  monacoBootstrapped = true
}

export function WorkspaceBundleEditor({
  ariaLabel,
  minHeight = 360,
  onChange,
  value
}: {
  ariaLabel: string
  minHeight?: number
  onChange: (value: string) => void
  value: string
}) {
  const theme = useTheme()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const valueRef = useRef(value)

  valueRef.current = value

  useEffect(() => {
    ensureMonacoBootstrapped()
  }, [])

  useEffect(() => {
    monaco.editor.defineTheme(LIGHT_THEME_NAME, {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': theme.palette.background.paper,
        'editor.foreground': theme.palette.text.primary,
        'editor.lineHighlightBackground': theme.palette.action.hover,
        'editorLineNumber.foreground': theme.palette.text.disabled,
        'editorLineNumber.activeForeground': theme.palette.text.secondary,
        'editor.selectionBackground': theme.palette.action.selected,
        'editor.inactiveSelectionBackground': theme.palette.action.focus,
        'editorIndentGuide.background1': theme.palette.divider,
        'editorIndentGuide.activeBackground1': theme.palette.text.disabled,
        'editorWhitespace.foreground': theme.palette.divider
      }
    })

    monaco.editor.defineTheme(DARK_THEME_NAME, {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': theme.palette.background.paper,
        'editor.foreground': theme.palette.text.primary,
        'editor.lineHighlightBackground': theme.palette.action.hover,
        'editorLineNumber.foreground': theme.palette.text.disabled,
        'editorLineNumber.activeForeground': theme.palette.text.secondary,
        'editor.selectionBackground': theme.palette.action.selected,
        'editor.inactiveSelectionBackground': theme.palette.action.focus,
        'editorIndentGuide.background1': theme.palette.divider,
        'editorIndentGuide.activeBackground1': theme.palette.text.disabled,
        'editorWhitespace.foreground': theme.palette.divider
      }
    })

    monaco.editor.setTheme(theme.palette.mode === 'dark' ? DARK_THEME_NAME : LIGHT_THEME_NAME)
  }, [theme])

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const model =
      monaco.editor.getModel(WORKSPACE_BUNDLE_MODEL_URI)
      ?? monaco.editor.createModel(value, 'json', WORKSPACE_BUNDLE_MODEL_URI)

    if (model.getValue() !== value) {
      model.setValue(value)
    }

    const editor = monaco.editor.create(containerRef.current, {
      ariaLabel,
      automaticLayout: true,
      bracketPairColorization: {
        enabled: true
      },
      formatOnPaste: true,
      formatOnType: true,
      glyphMargin: false,
      lineNumbersMinChars: 3,
      minimap: {
        enabled: false
      },
      model,
      padding: {
        bottom: 12,
        top: 12
      },
      quickSuggestions: {
        comments: false,
        other: true,
        strings: true
      },
      roundedSelection: true,
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      tabSize: 2,
      wordWrap: 'on'
    })

    const subscription = editor.onDidChangeModelContent(() => {
      const nextValue = editor.getValue()
      if (nextValue !== valueRef.current) {
        onChange(nextValue)
      }
    })

    editorRef.current = editor

    return () => {
      subscription.dispose()
      editor.dispose()
      model.dispose()
      editorRef.current = null
    }
  }, [ariaLabel, onChange])

  useEffect(() => {
    const model = editorRef.current?.getModel()
    if (model && model.getValue() !== value) {
      model.setValue(value)
    }
  }, [value])

  return (
    <Box
      sx={{
        minHeight,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'background.paper'
      }}
    >
      <Box ref={containerRef} sx={{ height: minHeight, width: '100%' }} />
    </Box>
  )
}
