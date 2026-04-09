import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export type RuntimeDocsLocale = 'en' | 'zh-Hans'

export interface RuntimeDocsManifestDocument {
  route: string
  locale: RuntimeDocsLocale
  sourcePath: string
  contentFile: string
}

export interface RuntimeDocsManifest {
  version: number
  documents: RuntimeDocsManifestDocument[]
}

export interface RuntimeDocAsset extends RuntimeDocsManifestDocument {
  content: string
}

export interface ParsedRuntimeDocsRequestPath {
  baseRoute: string
  explicitLocale?: RuntimeDocsLocale
}

const DEFAULT_RUNTIME_DOCS_DIR = fileURLToPath(new URL('../runtime-docs', import.meta.url))

let defaultCatalogPromise: Promise<RuntimeDocsCatalog> | undefined

export async function loadRuntimeDocsCatalog(
  rootDir = DEFAULT_RUNTIME_DOCS_DIR
): Promise<RuntimeDocsCatalog> {
  if (rootDir !== DEFAULT_RUNTIME_DOCS_DIR) {
    return await readRuntimeDocsCatalog(rootDir)
  }

  if (!defaultCatalogPromise) {
    defaultCatalogPromise = readRuntimeDocsCatalog(rootDir).catch((error) => {
      defaultCatalogPromise = undefined
      throw error
    })
  }

  return await defaultCatalogPromise
}

export async function resolveRuntimeDoc(
  pathname: string,
  acceptLanguage?: string,
  rootDir = DEFAULT_RUNTIME_DOCS_DIR
): Promise<RuntimeDocAsset | undefined> {
  const parsedPath = parseRuntimeDocsRequestPath(pathname)

  if (!parsedPath) {
    return undefined
  }

  try {
    const catalog = await loadRuntimeDocsCatalog(rootDir)
    return catalog.resolve(parsedPath, acceptLanguage)
  } catch (error) {
    if (isMissingRuntimeDocsManifestError(error)) {
      return undefined
    }

    throw error
  }
}

export function parseRuntimeDocsRequestPath(
  pathname: string
): ParsedRuntimeDocsRequestPath | undefined {
  let explicitLocale: RuntimeDocsLocale | undefined
  let candidatePath = pathname

  if (pathname === '/zh-Hans' || pathname.startsWith('/zh-Hans/')) {
    explicitLocale = 'zh-Hans'
    candidatePath = pathname.slice('/zh-Hans'.length) || '/'
  }

  const normalized = trimTrailingSlash(candidatePath) || '/'

  if (normalized === '/' || normalized === '/SKILL.md') {
    return {
      baseRoute: '/SKILL.md',
      ...(explicitLocale ? { explicitLocale } : {})
    }
  }

  const lastSegment = normalized.slice(normalized.lastIndexOf('/') + 1)

  if (lastSegment.includes('.') && lastSegment !== 'SKILL.md') {
    return undefined
  }

  return {
    baseRoute: normalized.endsWith('/SKILL.md')
      ? normalized
      : `${normalized}/SKILL.md`,
    ...(explicitLocale ? { explicitLocale } : {})
  }
}

export function chooseRuntimeDocsLocale(
  acceptLanguage: string | undefined
): RuntimeDocsLocale {
  if (!acceptLanguage) {
    return 'en'
  }

  const preferredTags = acceptLanguage
    .split(',')
    .map((part, index) => parseAcceptLanguagePreference(part, index))
    .filter((preference) => preference !== undefined)
    .sort((left, right) => {
      if (right.q !== left.q) {
        return right.q - left.q
      }

      return left.index - right.index
    })

  for (const preference of preferredTags) {
    const locale = matchRuntimeDocsLocale(preference.tag)

    if (locale) {
      return locale
    }
  }

  return 'en'
}

export class RuntimeDocsCatalog {
  private readonly documentsByRoute: Map<string, RuntimeDocAsset>

  constructor(documents: RuntimeDocAsset[]) {
    this.documentsByRoute = new Map(
      documents.map((document) => [document.route, document] as const)
    )
  }

  resolve(
    requestPath: ParsedRuntimeDocsRequestPath,
    acceptLanguage: string | undefined
  ): RuntimeDocAsset | undefined {
    const locales = requestPath.explicitLocale
      ? [requestPath.explicitLocale]
      : orderPreferredLocales(chooseRuntimeDocsLocale(acceptLanguage))

    for (const locale of locales) {
      const route = locale === 'zh-Hans'
        ? `/zh-Hans${requestPath.baseRoute}`
        : requestPath.baseRoute
      const document = this.documentsByRoute.get(route)

      if (document) {
        return document
      }
    }

    return undefined
  }
}

async function readRuntimeDocsCatalog(rootDir: string): Promise<RuntimeDocsCatalog> {
  const manifestPath = resolve(rootDir, 'manifest.json')
  let manifest: RuntimeDocsManifest

  try {
    manifest = await readRuntimeDocsManifest(manifestPath)
  } catch (error) {
    if (isFileNotFoundError(error)) {
      throw new MissingRuntimeDocsManifestError(manifestPath, error)
    }

    throw error
  }

  const documents = await Promise.all(
    manifest.documents.map(async (document) => ({
      ...document,
      content: await readFile(resolve(rootDir, document.contentFile), 'utf8')
    }))
  )

  return new RuntimeDocsCatalog(documents)
}

async function readRuntimeDocsManifest(manifestPath: string): Promise<RuntimeDocsManifest> {
  const parsed = JSON.parse(await readFile(manifestPath, 'utf8')) as unknown

  if (!isRuntimeDocsManifest(parsed)) {
    throw new Error(`Invalid runtime docs manifest at ${manifestPath}`)
  }

  return parsed
}

function isRuntimeDocsManifest(value: unknown): value is RuntimeDocsManifest {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    typeof (value as { version: unknown }).version === 'number' &&
    'documents' in value &&
    Array.isArray((value as { documents: unknown }).documents) &&
    (value as { documents: unknown[] }).documents.every(isRuntimeDocsManifestDocument)
  )
}

function isRuntimeDocsManifestDocument(
  value: unknown
): value is RuntimeDocsManifestDocument {
  return (
    typeof value === 'object' &&
    value !== null &&
    'route' in value &&
    typeof (value as { route: unknown }).route === 'string' &&
    'locale' in value &&
    ((value as { locale: unknown }).locale === 'en' ||
      (value as { locale: unknown }).locale === 'zh-Hans') &&
    'sourcePath' in value &&
    typeof (value as { sourcePath: unknown }).sourcePath === 'string' &&
    'contentFile' in value &&
    typeof (value as { contentFile: unknown }).contentFile === 'string'
  )
}

function parseAcceptLanguagePreference(
  value: string,
  index: number
): { tag: string; q: number; index: number } | undefined {
  const [rawTag, ...parameterParts] = value.split(';')
  const tag = rawTag?.trim().toLowerCase() ?? ''

  if (tag.length === 0) {
    return undefined
  }

  let q = 1

  for (const parameterPart of parameterParts) {
    const [rawKey, rawValue] = parameterPart.split('=')

    if (rawKey?.trim().toLowerCase() !== 'q') {
      continue
    }

    const parsedQ = Number.parseFloat(rawValue?.trim() ?? '')

    if (!Number.isFinite(parsedQ)) {
      break
    }

    q = Math.min(1, Math.max(0, parsedQ))
    break
  }

  if (q <= 0) {
    return undefined
  }

  return { tag, q, index }
}

function matchRuntimeDocsLocale(tag: string): RuntimeDocsLocale | undefined {
  if (tag === 'zh' || tag === 'zh-cn' || tag === 'zh-hans') {
    return 'zh-Hans'
  }

  if (tag === 'en' || tag.startsWith('en-') || tag === '*') {
    return 'en'
  }

  return undefined
}

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

function isMissingRuntimeDocsManifestError(
  error: unknown
): error is MissingRuntimeDocsManifestError {
  return error instanceof MissingRuntimeDocsManifestError
}

class MissingRuntimeDocsManifestError extends Error {
  readonly cause: unknown

  constructor(manifestPath: string, cause: unknown) {
    super(`Missing runtime docs manifest at ${manifestPath}`)
    this.name = 'MissingRuntimeDocsManifestError'
    this.cause = cause
  }
}

function trimTrailingSlash(value: string): string {
  if (value === '/') {
    return value
  }

  return value.endsWith('/') ? value.slice(0, -1) : value
}

function orderPreferredLocales(
  preferredLocale: RuntimeDocsLocale
): RuntimeDocsLocale[] {
  return preferredLocale === 'zh-Hans'
    ? ['zh-Hans', 'en']
    : ['en', 'zh-Hans']
}
