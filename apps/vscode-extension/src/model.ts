export interface ExtensionConfiguration {
  serverUrl: string
  autoConnect: boolean
  autoReconnect: boolean
  reconnectDelayMs: number
  clientId: string | undefined
  clientName: string | undefined
  authToken: string | undefined
  allowedCommands: string[]
  findFilesMaxResults: number
  textSearchMaxResults: number
  resourceTextLimit: number
  diagnosticResultLimit: number
}

export interface TextSlice {
  text: string
  truncated: boolean
  totalLength: number
}

export interface SerializedPosition {
  line: number
  character: number
}

export interface SerializedRange {
  start: SerializedPosition
  end: SerializedPosition
}

export type DiagnosticSeverityLabel = 'error' | 'warning' | 'information' | 'hint'

export interface SerializedDiagnostic {
  uri: string
  severity: DiagnosticSeverityLabel
  message: string
  range: SerializedRange
  source?: string
  code?: string | number
}

export interface PromptMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface PromptPayload {
  description: string
  messages: PromptMessage[]
}

export interface ReviewPromptOptions {
  fileLabel: string
  languageId: string
  sourceKind: 'selection' | 'document'
  text: TextSlice
  diagnostics: readonly SerializedDiagnostic[]
  goal: string | undefined
  tone: string | undefined
}

const DEFAULT_TEXT_LIMIT = 20_000
const DEFAULT_FIND_FILES_LIMIT = 200
const DEFAULT_TEXT_SEARCH_LIMIT = 200
const DEFAULT_DIAGNOSTIC_LIMIT = 200
const DEFAULT_RECONNECT_DELAY_MS = 3_000
const MAX_JSON_DEPTH = 10

export function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

export function clampPositiveInteger(
  value: number | undefined,
  fallback: number,
  max = Number.MAX_SAFE_INTEGER
): number {
  if (!Number.isFinite(value) || value === undefined) {
    return fallback
  }

  if (value <= 0) {
    return fallback
  }

  return Math.min(Math.floor(value), max)
}

export function normalizeAllowedCommands(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const seen = new Set<string>()
  const commands: string[] = []

  for (const item of value) {
    const command = normalizeOptionalString(item)

    if (!command || seen.has(command)) {
      continue
    }

    seen.add(command)
    commands.push(command)
  }

  return commands
}

export function getWorkspaceLabel(workspaceNames: readonly string[]): string {
  if (workspaceNames.length === 0) {
    return 'window'
  }

  if (workspaceNames.length === 1) {
    return workspaceNames[0] as string
  }

  return `${workspaceNames[0] as string} +${workspaceNames.length - 1}`
}

export function sanitizeClientSegment(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized.slice(0, 40) || 'workspace'
}

export function createDefaultClientId(machineId: string, workspaceLabel: string): string {
  const machine = sanitizeClientSegment(machineId).slice(0, 16)
  const workspace = sanitizeClientSegment(workspaceLabel).slice(0, 24)
  return `vscode-${machine}-${workspace}`
}

export function createDefaultClientName(workspaceLabel: string): string {
  return workspaceLabel === 'window' ? 'VSCode Window' : `VSCode ${workspaceLabel}`
}

export function truncateText(text: string, limit = DEFAULT_TEXT_LIMIT): TextSlice {
  const normalizedLimit = clampPositiveInteger(limit, DEFAULT_TEXT_LIMIT, 200_000)

  if (text.length <= normalizedLimit) {
    return {
      text,
      truncated: false,
      totalLength: text.length
    }
  }

  return {
    text: `${text.slice(0, normalizedLimit)}\n\n[truncated ${text.length - normalizedLimit} chars]`,
    truncated: true,
    totalLength: text.length
  }
}

export function severityLabel(value: number): DiagnosticSeverityLabel {
  switch (value) {
    case 0:
      return 'error'
    case 1:
      return 'warning'
    case 2:
      return 'information'
    default:
      return 'hint'
  }
}

export function toJsonCompatible(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>()
): unknown {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value ?? null
  }

  if (depth >= MAX_JSON_DEPTH) {
    return '[MaxDepth]'
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message
    }
  }

  if (Array.isArray(value)) {
    return value.map((entry) => toJsonCompatible(entry, depth + 1, seen))
  }

  if (typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]'
    }

    seen.add(value)

    if ('toJSON' in value && typeof value.toJSON === 'function') {
      return toJsonCompatible(value.toJSON(), depth + 1, seen)
    }

    const record = value as Record<string, unknown>
    const normalized: Record<string, unknown> = {}

    for (const [key, entry] of Object.entries(record)) {
      normalized[key] = toJsonCompatible(entry, depth + 1, seen)
    }

    return normalized
  }

  return String(value)
}

export function createReviewPrompt(options: ReviewPromptOptions): PromptPayload {
  const goal = normalizeOptionalString(options.goal) ?? 'review for correctness, risks, and missing tests'
  const tone = normalizeOptionalString(options.tone) ?? 'concise and specific'
  const diagnostics = formatDiagnostics(options.diagnostics)
  const promptLabel = options.sourceKind === 'selection' ? 'selected code' : 'active document excerpt'

  return {
    description: `Review the ${promptLabel} from ${options.fileLabel}`,
    messages: [
      {
        role: 'system',
        content: `You are reviewing code captured from VSCode. Focus on ${goal}. Keep the response ${tone}.`
      },
      {
        role: 'user',
        content: [
          `File: ${options.fileLabel}`,
          `Language: ${options.languageId}`,
          `Source: ${promptLabel}`,
          `Text truncated: ${options.text.truncated ? 'yes' : 'no'}`,
          diagnostics,
          '',
          'Code:',
          '```',
          options.text.text,
          '```'
        ].join('\n')
      }
    ]
  }
}

export function createUnavailablePrompt(reason: string): PromptPayload {
  return {
    description: 'No active editor context is available',
    messages: [
      {
        role: 'user',
        content: reason
      }
    ]
  }
}

export function defaultFindFilesLimit(value: number | undefined): number {
  return clampPositiveInteger(value, DEFAULT_FIND_FILES_LIMIT, 1_000)
}

export function defaultResourceTextLimit(value: number | undefined): number {
  return clampPositiveInteger(value, DEFAULT_TEXT_LIMIT, 200_000)
}

export function defaultTextSearchLimit(value: number | undefined): number {
  return clampPositiveInteger(value, DEFAULT_TEXT_SEARCH_LIMIT, 1_000)
}

export function defaultDiagnosticLimit(value: number | undefined): number {
  return clampPositiveInteger(value, DEFAULT_DIAGNOSTIC_LIMIT, 1_000)
}

export function defaultReconnectDelayMs(value: number | undefined): number {
  return clampPositiveInteger(value, DEFAULT_RECONNECT_DELAY_MS, 60_000)
}

function formatDiagnostics(diagnostics: readonly SerializedDiagnostic[]): string {
  if (diagnostics.length === 0) {
    return 'Diagnostics: none'
  }

  const items = diagnostics.map((diagnostic, index) => {
    const source = diagnostic.source ? ` from ${diagnostic.source}` : ''
    const code = diagnostic.code !== undefined ? ` (${String(diagnostic.code)})` : ''

    return `${index + 1}. [${diagnostic.severity}]${source}${code} ${diagnostic.message} @ ${
      diagnostic.range.start.line + 1
    }:${diagnostic.range.start.character + 1}`
  })

  return `Diagnostics:\n${items.join('\n')}`
}
