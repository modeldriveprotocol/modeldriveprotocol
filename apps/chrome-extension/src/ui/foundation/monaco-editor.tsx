import { Box, useTheme } from '@mui/material'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

import {
  applyMonacoTheme,
  ensureMonacoBootstrapped,
  ensureMonacoJsonSchema,
  monaco
} from './monaco.js'

export interface MonacoCodeEditorHandle {
  focus: () => void
  insertText: (text: string) => void
}

type MonacoCodeEditorProps = {
  ariaLabel: string
  frame?: 'outlined' | 'plain'
  height?: number | string
  jsonSchema?: {
    schemaUri: string
    schema: unknown
  }
  language: string
  minHeight?: number
  modelUri: string
  onChange: (value: string) => void
  options?: monaco.editor.IStandaloneEditorConstructionOptions
  value: string
}

export const MonacoCodeEditor = forwardRef<
  MonacoCodeEditorHandle,
  MonacoCodeEditorProps
>(
  (
    {
      ariaLabel,
      frame = 'plain',
      height,
      jsonSchema,
      language,
      minHeight = 360,
      modelUri,
      onChange,
      options,
      value
    },
    ref
  ) => {
    const theme = useTheme()
    const containerRef = useRef<HTMLDivElement | null>(null)
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
    const onChangeRef = useRef(onChange)
    const valueRef = useRef(value)

    onChangeRef.current = onChange
    valueRef.current = value

    useEffect(() => {
      ensureMonacoBootstrapped()

      if (jsonSchema) {
        ensureMonacoJsonSchema({
          schemaUri: jsonSchema.schemaUri,
          modelUri,
          schema: jsonSchema.schema
        })
      }
    }, [jsonSchema, modelUri])

    useEffect(() => {
      applyMonacoTheme(theme)
    }, [theme])

    useImperativeHandle(
      ref,
      () => ({
        focus() {
          editorRef.current?.focus()
        },
        insertText(text: string) {
          const editor = editorRef.current
          const selection = editor?.getSelection()

          if (!editor || !selection) {
            return
          }

          editor.pushUndoStop()
          editor.executeEdits('mdp-monaco-editor', [
            {
              range: selection,
              text,
              forceMoveMarkers: true
            }
          ])
          editor.pushUndoStop()
          editor.focus()
        }
      }),
      []
    )

    useEffect(() => {
      if (!containerRef.current) {
        return
      }

      const uri = monaco.Uri.parse(modelUri)
      const model =
        monaco.editor.getModel(uri) ??
        monaco.editor.createModel(value, language, uri)

      if (model.getValue() !== value) {
        model.setValue(value)
      }

      const editor = monaco.editor.create(containerRef.current, {
        ariaLabel,
        automaticLayout: true,
        bracketPairColorization: {
          enabled: true
        },
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
        roundedSelection: true,
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        tabSize: 2,
        ...options
      })

      const subscription = editor.onDidChangeModelContent(() => {
        const nextValue = editor.getValue()

        if (nextValue !== valueRef.current) {
          onChangeRef.current(nextValue)
        }
      })

      editorRef.current = editor

      return () => {
        subscription.dispose()
        editor.dispose()
        model.dispose()
        editorRef.current = null
      }
    }, [ariaLabel, language, modelUri])

    useEffect(() => {
      const model = editorRef.current?.getModel()

      if (model && model.getValue() !== value) {
        model.setValue(value)
      }
    }, [value])

    useEffect(() => {
      if (options && editorRef.current) {
        editorRef.current.updateOptions(options)
      }
    }, [options])

    return (
      <Box
        sx={{
          ...(height !== undefined ? { height } : {}),
          minHeight,
          overflow: 'hidden',
          ...(frame === 'outlined'
            ? {
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper'
              }
            : {})
        }}
      >
        <Box
          ref={containerRef}
          sx={{ height: height ?? minHeight, minHeight, width: '100%' }}
        />
      </Box>
    )
  }
)

MonacoCodeEditor.displayName = 'MonacoCodeEditor'
