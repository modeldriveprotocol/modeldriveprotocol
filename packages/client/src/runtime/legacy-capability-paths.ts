function slugifySegment(value: string): string {
  const normalized = value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase()
    .replace(/^-+|-+$/g, '')

  return normalized || 'item'
}

function hashString(value: string): string {
  let hash = 0x811c9dc5

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return (hash >>> 0).toString(16).padStart(8, '0')
}

function buildCompatPath(
  category: 'tools' | 'prompts' | 'skills' | 'resources',
  segments: string[],
  stableId: string,
  leaf?: 'prompt.md' | 'skill.md'
): string {
  const pathSegments = ['compat', category, ...segments, hashString(stableId)]
  const base = `/${pathSegments.join('/')}`

  return leaf ? `${base}/${leaf}` : base
}

function splitCapabilityName(value: string): string[] {
  const segments = value
    .split(/[/.]+/)
    .map((segment) => slugifySegment(segment))
    .filter(Boolean)

  return segments.length > 0 ? segments : ['item']
}

function splitResourceUri(uri: string): string[] {
  const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/(.*)$/.exec(uri)

  if (!match) {
    return splitCapabilityName(uri)
  }

  const scheme = match[1] ?? 'resource'
  const remainder = match[2] ?? ''
  const segments = [
    slugifySegment(scheme),
    ...remainder
      .split('/')
      .map((segment) => slugifySegment(segment))
      .filter(Boolean)
  ]

  return segments.length > 0 ? segments : ['resource']
}

export function createLegacyToolPath(name: string): string {
  return buildCompatPath('tools', splitCapabilityName(name), name)
}

export function createLegacyPromptPath(name: string): string {
  return buildCompatPath('prompts', splitCapabilityName(name), name, 'prompt.md')
}

export function createLegacySkillPath(name: string): string {
  return buildCompatPath('skills', splitCapabilityName(name), name, 'skill.md')
}

export function createLegacyResourcePath(uri: string): string {
  return buildCompatPath('resources', splitResourceUri(uri), uri)
}
