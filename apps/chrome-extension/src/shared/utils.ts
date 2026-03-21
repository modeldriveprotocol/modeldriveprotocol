export type UnknownRecord = Record<string, unknown>

export interface SerializedError {
  message: string
  stack?: string
  cause?: string
}

export interface UrlMatchCondition {
  url?: string
  includes?: string
  matches?: string
}

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {}
}

export function readString(
  record: UnknownRecord,
  key: string
): string | undefined {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

export function readBoolean(
  record: UnknownRecord,
  key: string
): boolean | undefined {
  const value = record[key]
  return typeof value === 'boolean' ? value : undefined
}

export function readNumber(
  record: UnknownRecord,
  key: string
): number | undefined {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function readStringArray(
  record: UnknownRecord,
  key: string
): string[] | undefined {
  const value = record[key]

  if (!Array.isArray(value)) {
    return undefined
  }

  const strings = value.filter((item): item is string => typeof item === 'string')
  return strings.length > 0 ? strings : []
}

export function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)]
}

export function truncateText(text: string, maxLength: number): string {
  if (maxLength < 0 || text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, Math.max(0, maxLength - 1))}\u2026`
}

export function createRequestId(prefix = 'mdp'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return {
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
      ...(error.cause ? { cause: String(error.cause) } : {})
    }
  }

  return {
    message: String(error)
  }
}

export function createStableId(prefix: string, value: string): string {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return `${prefix}-${(hash >>> 0).toString(16)}`
}

export function normalizeUrlMatchCondition(condition: UrlMatchCondition): UrlMatchCondition {
  const url = condition.url?.trim()
  const includes = condition.includes?.trim()
  const matches = condition.matches?.trim()

  return {
    ...(url ? { url } : {}),
    ...(includes ? { includes } : {}),
    ...(matches ? { matches } : {})
  }
}

export function assertUrlMatchCondition(condition: UrlMatchCondition): UrlMatchCondition {
  const normalized = normalizeUrlMatchCondition(condition)

  if (!normalized.url && !normalized.includes && !normalized.matches) {
    throw new Error('One of url, includes, or matches is required')
  }

  if (normalized.matches) {
    try {
      void new RegExp(normalized.matches)
    } catch (error) {
      throw new Error(
        `Invalid matches regular expression: ${serializeError(error).message}`
      )
    }
  }

  return normalized
}

export function matchesUrlCondition(currentUrl: string, condition: UrlMatchCondition): boolean {
  const normalized = assertUrlMatchCondition(condition)

  return (
    (!normalized.url || currentUrl === normalized.url) &&
    (!normalized.includes || currentUrl.includes(normalized.includes)) &&
    (!normalized.matches || new RegExp(normalized.matches).test(currentUrl))
  )
}

export function describeUrlMatchCondition(condition: UrlMatchCondition): string {
  const normalized = assertUrlMatchCondition(condition)
  const parts: string[] = []

  if (normalized.url) {
    parts.push(`url = "${normalized.url}"`)
  }

  if (normalized.includes) {
    parts.push(`url includes "${normalized.includes}"`)
  }

  if (normalized.matches) {
    parts.push(`url matches /${normalized.matches}/`)
  }

  return parts.join(' && ')
}

export function normalizeForMessaging(value: unknown): unknown {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }

  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return String(value)
  }
}
