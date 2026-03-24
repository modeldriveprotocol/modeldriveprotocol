import type { Theme } from '@mui/material/styles'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
// Monaco exposes this ESM contribution at runtime, but does not ship a
// matching declaration file that TypeScript can resolve from this entrypoint.
// @ts-expect-error Runtime export is available in Monaco's ESM bundle.
import * as monacoJsonContribution from 'monaco-editor/esm/vs/language/json/monaco.contribution'
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution'
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

declare global {
  var MonacoEnvironment:
    | {
        getWorker: (_moduleId: string, label: string) => Worker
      }
    | undefined
}

const LIGHT_THEME_NAME = 'mdp-monaco-light'
const DARK_THEME_NAME = 'mdp-monaco-dark'

type JsonSchemaRegistration = {
  schemaUri: string
  modelUri: string
  schema: unknown
}

type MonacoJsonContributionModule = {
  jsonDefaults?: {
    setDiagnosticsOptions: (options: unknown) => void
  }
}

const jsonSchemaRegistrations = new Map<string, JsonSchemaRegistration>()
let monacoBootstrapped = false

export function ensureMonacoBootstrapped(): void {
  if (monacoBootstrapped) {
    return
  }

  globalThis.MonacoEnvironment = {
    getWorker(_moduleId, label) {
      if (label === 'json') {
        return new jsonWorker()
      }

      return new editorWorker()
    }
  }

  monacoBootstrapped = true
}

export function ensureMonacoJsonSchema(registration: JsonSchemaRegistration): void {
  ensureMonacoBootstrapped()

  const key = `${registration.schemaUri}:${registration.modelUri}`

  if (!jsonSchemaRegistrations.has(key)) {
    jsonSchemaRegistrations.set(key, registration)
  }

  const jsonDefaults = (monacoJsonContribution as MonacoJsonContributionModule)
    .jsonDefaults

  if (!jsonDefaults) {
    throw new Error('Monaco JSON language service is unavailable.')
  }

  jsonDefaults.setDiagnosticsOptions({
    allowComments: false,
    enableSchemaRequest: false,
    schemaValidation: 'warning',
    validate: true,
    schemas: [...jsonSchemaRegistrations.values()].map((item) => ({
      uri: item.schemaUri,
      fileMatch: [item.modelUri],
      schema: item.schema
    }))
  })
}

export function applyMonacoTheme(theme: Theme): void {
  ensureMonacoBootstrapped()

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
}

export { monaco }
