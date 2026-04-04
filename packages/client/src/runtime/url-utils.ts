const ABSOLUTE_URL_PATTERN = /^([A-Za-z][A-Za-z\d+.-]*:)?\/\/([^/?#]+)([^?#]*)?(\?[^#]*)?(#.*)?$/

interface ParsedAbsoluteUrl {
  protocol: string
  authority: string
  path: string
  search: string
  hash: string
}

export function getUrlProtocol(url: string): string {
  return parseAbsoluteUrl(url).protocol
}

export function replaceUrlProtocol(url: string, protocol: string): string {
  const parsed = parseAbsoluteUrl(url)
  return `${protocol}//${parsed.authority}${parsed.path}${parsed.search}${parsed.hash}`
}

export function resolveUrl(baseUrl: string, target: string): string {
  if (isAbsoluteUrl(target)) {
    return target
  }

  const base = parseAbsoluteUrl(baseUrl)

  if (target.startsWith('//')) {
    return `${base.protocol}${target}`
  }

  if (target.startsWith('#')) {
    return `${base.protocol}//${base.authority}${base.path}${base.search}${target}`
  }

  if (target.startsWith('?')) {
    return `${base.protocol}//${base.authority}${base.path}${target}`
  }

  const path = resolvePath(base.path, target)
  return `${base.protocol}//${base.authority}${path}`
}

function parseAbsoluteUrl(url: string): ParsedAbsoluteUrl {
  const match = ABSOLUTE_URL_PATTERN.exec(url)

  if (!match?.[1] || !match[2]) {
    throw new Error(`Invalid absolute URL: ${url}`)
  }

  return {
    protocol: match[1],
    authority: match[2],
    path: match[3] || '/',
    search: match[4] || '',
    hash: match[5] || ''
  }
}

function isAbsoluteUrl(url: string): boolean {
  return ABSOLUTE_URL_PATTERN.test(url)
}

function resolvePath(basePath: string, target: string): string {
  if (!target) {
    return basePath
  }

  if (target.startsWith('/')) {
    return normalizePath(target)
  }

  const baseDirectory = basePath.endsWith('/')
    ? basePath
    : basePath.slice(0, basePath.lastIndexOf('/') + 1)

  return normalizePath(`${baseDirectory}${target}`)
}

function normalizePath(path: string): string {
  const hasLeadingSlash = path.startsWith('/')
  const hasTrailingSlash = path.endsWith('/')
  const normalizedSegments: string[] = []

  for (const segment of path.split('/')) {
    if (!segment || segment === '.') {
      continue
    }

    if (segment === '..') {
      normalizedSegments.pop()
      continue
    }

    normalizedSegments.push(segment)
  }

  const normalized = `${hasLeadingSlash ? '/' : ''}${normalizedSegments.join('/')}`

  if (!normalized) {
    return hasLeadingSlash ? '/' : '.'
  }

  if (hasTrailingSlash && normalized !== '/') {
    return `${normalized}/`
  }

  return normalized
}
