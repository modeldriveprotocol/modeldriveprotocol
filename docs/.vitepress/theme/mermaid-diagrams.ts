const diagramModules = import.meta.glob('./diagrams/**/*.mmd', {
  eager: true,
  import: 'default',
  query: '?raw'
}) as Record<string, string>

const diagramPrefix = './diagrams/'
const diagramSuffix = '.mmd'
const localeSuffixPattern = /\.([A-Za-z]{2,}(?:-[A-Za-z0-9]+)*)$/u

interface LocalizedDiagrams {
  default?: string
  locales: Record<string, string>
}

const mermaidDiagrams = Object.entries(diagramModules).reduce<Record<string, LocalizedDiagrams>>(
  (diagrams, [modulePath, source]) => {
    const relativePath = modulePath
      .replace(diagramPrefix, '')
      .replace(new RegExp(`${diagramSuffix}$`, 'u'), '')

    const localeMatch = relativePath.match(localeSuffixPattern)
    const locale = localeMatch?.[1]
    const name = locale
      ? relativePath.slice(0, -(`.${locale}`.length))
      : relativePath

    const entry = diagrams[name] ?? { locales: {} }
    if (locale) {
      entry.locales[locale] = source
    } else {
      entry.default = source
    }

    diagrams[name] = entry
    return diagrams
  },
  {}
)

function getLocaleCandidates(locale: string | undefined) {
  if (!locale) {
    return []
  }

  const trimmed = locale.trim()
  if (!trimmed) {
    return []
  }

  const [language] = trimmed.split('-', 1)
  return language && language !== trimmed ? [trimmed, language] : [trimmed]
}

export function resolveMermaidDiagram(name: string, locale: string | undefined) {
  const diagram = mermaidDiagrams[name]
  if (!diagram) {
    throw new Error(`Unknown shared Mermaid diagram: ${name}`)
  }

  for (const candidate of getLocaleCandidates(locale)) {
    const localized = diagram.locales[candidate]
    if (localized) {
      return localized
    }
  }

  if (diagram.default) {
    return diagram.default
  }

  throw new Error(
    `Shared Mermaid diagram "${name}" is missing a default source file`
  )
}
