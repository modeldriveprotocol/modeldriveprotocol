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

type MonacoTokenPalette = {
  comment: string
  delimiter: string
  invalid: string
  keyword: string
  link: string
  number: string
  property: string
  regexp: string
  string: string
  subtle: string
  type: string
}

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

  const tokenPalette = getMonacoTokenPalette(theme)
  const tokenRules = createMonacoTokenRules(theme, tokenPalette)
  const editorColors = getMonacoEditorColors(theme)

  monaco.editor.defineTheme(LIGHT_THEME_NAME, {
    base: 'vs',
    inherit: false,
    rules: tokenRules,
    colors: editorColors
  })

  monaco.editor.defineTheme(DARK_THEME_NAME, {
    base: 'vs-dark',
    inherit: false,
    rules: tokenRules,
    colors: editorColors
  })

  monaco.editor.setTheme(theme.palette.mode === 'dark' ? DARK_THEME_NAME : LIGHT_THEME_NAME)
}

function getMonacoEditorColors(
  theme: Theme
): monaco.editor.IStandaloneThemeData['colors'] {
  const isDark = theme.palette.mode === 'dark'

  return {
    'editor.background': theme.palette.background.paper,
    'editor.foreground': theme.palette.text.primary,
    'editorGutter.background': theme.palette.background.paper,
    'editorCursor.foreground': theme.palette.primary.main,
    'editor.lineHighlightBackground': isDark ? '#1b2431' : '#f5f8fc',
    'editor.lineHighlightBorder': isDark ? '#1b2431' : '#f5f8fc',
    'editorLineNumber.foreground': isDark ? '#73839b' : '#8090a4',
    'editorLineNumber.activeForeground': isDark ? '#c5d3e8' : '#24374f',
    'editor.selectionBackground': isDark ? '#274b72' : '#dceaff',
    'editor.inactiveSelectionBackground': isDark ? '#22364e' : '#ebf3ff',
    'editor.selectionHighlightBackground': isDark
      ? '#35506f66'
      : '#bfd7ff66',
    'editor.wordHighlightBackground': isDark ? '#2c4a6a66' : '#d7e8ff66',
    'editor.wordHighlightStrongBackground': isDark
      ? '#3b608866'
      : '#c4dcff99',
    'editor.findMatchBackground': isDark ? '#49698f' : '#c9deff',
    'editor.findMatchHighlightBackground': isDark
      ? '#35506f88'
      : '#e1eeff',
    'editorBracketMatch.background': isDark ? '#22364e' : '#e8f0fe',
    'editorBracketMatch.border': isDark ? '#4d79a8' : '#97b7f7',
    'editorIndentGuide.background1': isDark ? '#2d3949' : '#dde4ee',
    'editorIndentGuide.activeBackground1': isDark ? '#5d6f87' : '#9cacbf',
    'editorWhitespace.foreground': isDark ? '#2d3949' : '#d5dce6',
    'editorOverviewRuler.border': theme.palette.background.paper
  }
}

function createMonacoTokenRules(
  theme: Theme,
  tokenPalette: MonacoTokenPalette
): monaco.editor.ITokenThemeRule[] {
  return [
    { token: '', foreground: toMonacoColor(theme.palette.text.primary) },
    {
      token: 'comment',
      foreground: toMonacoColor(tokenPalette.comment),
      fontStyle: 'italic'
    },
    {
      token: 'comment.doc',
      foreground: toMonacoColor(tokenPalette.comment),
      fontStyle: 'italic'
    },
    { token: 'delimiter', foreground: toMonacoColor(tokenPalette.delimiter) },
    {
      token: 'delimiter.bracket',
      foreground: toMonacoColor(tokenPalette.delimiter)
    },
    { token: 'keyword', foreground: toMonacoColor(tokenPalette.keyword) },
    {
      token: 'meta.separator',
      foreground: toMonacoColor(tokenPalette.subtle)
    },
    { token: 'number', foreground: toMonacoColor(tokenPalette.number) },
    { token: 'number.float', foreground: toMonacoColor(tokenPalette.number) },
    { token: 'number.hex', foreground: toMonacoColor(tokenPalette.number) },
    { token: 'number.octal', foreground: toMonacoColor(tokenPalette.number) },
    { token: 'number.binary', foreground: toMonacoColor(tokenPalette.number) },
    { token: 'regexp', foreground: toMonacoColor(tokenPalette.regexp) },
    {
      token: 'regexp.escape',
      foreground: toMonacoColor(tokenPalette.link)
    },
    {
      token: 'regexp.escape.control',
      foreground: toMonacoColor(tokenPalette.link)
    },
    { token: 'string', foreground: toMonacoColor(tokenPalette.string) },
    {
      token: 'string.escape',
      foreground: toMonacoColor(tokenPalette.link)
    },
    {
      token: 'string.link',
      foreground: toMonacoColor(tokenPalette.link)
    },
    {
      token: 'string.target',
      foreground: toMonacoColor(tokenPalette.string)
    },
    {
      token: 'string.key.json',
      foreground: toMonacoColor(tokenPalette.property)
    },
    {
      token: 'string.value.json',
      foreground: toMonacoColor(tokenPalette.string)
    },
    {
      token: 'type.identifier',
      foreground: toMonacoColor(tokenPalette.type)
    },
    { token: 'type', foreground: toMonacoColor(tokenPalette.type) },
    { token: 'tag', foreground: toMonacoColor(tokenPalette.type) },
    {
      token: 'attribute.name',
      foreground: toMonacoColor(tokenPalette.property)
    },
    {
      token: 'attribute.value',
      foreground: toMonacoColor(tokenPalette.string)
    },
    { token: 'variable', foreground: toMonacoColor(tokenPalette.number) },
    {
      token: 'variable.source',
      foreground: toMonacoColor(theme.palette.text.primary)
    },
    {
      token: 'variable.predefined',
      foreground: toMonacoColor(tokenPalette.type)
    },
    {
      token: 'strong',
      foreground: toMonacoColor(theme.palette.text.primary),
      fontStyle: 'bold'
    },
    {
      token: 'emphasis',
      foreground: toMonacoColor(theme.palette.text.primary),
      fontStyle: 'italic'
    },
    { token: 'escape', foreground: toMonacoColor(tokenPalette.link) },
    { token: 'invalid', foreground: toMonacoColor(tokenPalette.invalid) }
  ]
}

function getMonacoTokenPalette(theme: Theme): MonacoTokenPalette {
  if (theme.palette.mode === 'dark') {
    return {
      comment: '#7d8ca5',
      delimiter: '#a7b4c8',
      invalid: '#ff8a80',
      keyword: '#7aa2ff',
      link: '#7dc4ff',
      number: '#e7c06a',
      property: '#d9e4f7',
      regexp: '#d7b96d',
      string: '#91cfa8',
      subtle: '#6f8099',
      type: '#68cdd7'
    }
  }

  return {
    comment: '#6f7f95',
    delimiter: '#627186',
    invalid: '#cf4a3c',
    keyword: '#315fce',
    link: '#0f75cc',
    number: '#a96a00',
    property: '#1f3351',
    regexp: '#9a6200',
    string: '#21724d',
    subtle: '#8fa0b5',
    type: '#0b7f93'
  }
}

function toMonacoColor(value: string): string {
  return value.replace('#', '').toUpperCase()
}

export { monaco }
