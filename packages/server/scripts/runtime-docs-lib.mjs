import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = fileURLToPath(new URL('..', import.meta.url))
const repoRoot = resolve(packageRoot, '../..')
const DEFAULT_DOCS_DIR = resolve(repoRoot, 'docs')
const DEFAULT_OUTPUT_DIR = resolve(packageRoot, 'runtime-docs')

export function defaultRuntimeDocsPaths() {
  return {
    packageRoot,
    repoRoot,
    docsDir: DEFAULT_DOCS_DIR,
    outputDir: DEFAULT_OUTPUT_DIR
  }
}

export async function buildRuntimeDocs(options = {}) {
  const docsDir = resolve(options.docsDir ?? DEFAULT_DOCS_DIR)
  const outputDir = resolve(options.outputDir ?? DEFAULT_OUTPUT_DIR)
  const sourcePaths = (await listMarkdownFiles(docsDir)).sort((left, right) =>
    left.localeCompare(right)
  )
  const documents = sourcePaths.map((sourcePath) => ({
    ...sourcePathToRuntimeDocRoute(sourcePath),
    sourcePath: `docs/${normalizePathSeparators(sourcePath)}`,
    relativeSourcePath: normalizePathSeparators(sourcePath)
  }))
  const seenRoutes = new Set()

  for (const document of documents) {
    if (seenRoutes.has(document.route)) {
      throw new Error(`Duplicate runtime doc route "${document.route}"`)
    }

    seenRoutes.add(document.route)
  }

  await rm(outputDir, { recursive: true, force: true })
  await mkdir(outputDir, { recursive: true })

  const routeSet = new Set(documents.map((document) => document.route))

  for (const document of documents) {
    const targetPath = resolve(outputDir, document.contentFile)
    const content = isRootRuntimeDoc(document.relativeSourcePath)
      ? renderRootRuntimeDoc(document.locale)
      : normalizeRuntimeDocMarkdown(
          await readFile(resolve(docsDir, document.relativeSourcePath), 'utf8'),
          {
            locale: document.locale,
            routeSet
          }
        )

    await mkdir(dirname(targetPath), { recursive: true })
    await writeFile(targetPath, ensureTrailingNewline(content), 'utf8')
  }

  const manifest = {
    version: 1,
    documents: documents.map(({ relativeSourcePath: _unused, ...document }) => document)
  }

  await writeFile(
    resolve(outputDir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  )

  return manifest
}

export function sourcePathToRuntimeDocRoute(relativeSourcePath) {
  const normalized = normalizePathSeparators(relativeSourcePath)
  const locale = normalized === 'zh-Hans/index.md' || normalized.startsWith('zh-Hans/')
    ? 'zh-Hans'
    : 'en'
  const localeRelativePath = locale === 'zh-Hans'
    ? normalized.slice('zh-Hans/'.length)
    : normalized

  if (localeRelativePath === 'index.md') {
    const route = locale === 'zh-Hans' ? '/zh-Hans/SKILL.md' : '/SKILL.md'
    return {
      locale,
      route,
      contentFile: route.slice(1)
    }
  }

  const withoutExtension = localeRelativePath.slice(0, -'.md'.length)
  const logicalPath = withoutExtension.endsWith('/index')
    ? withoutExtension.slice(0, -'/index'.length)
    : withoutExtension
  const baseRoute = logicalPath.length > 0
    ? `/${logicalPath}/SKILL.md`
    : '/SKILL.md'
  const route = locale === 'zh-Hans' ? `/zh-Hans${baseRoute}` : baseRoute

  return {
    locale,
    route,
    contentFile: route.slice(1)
  }
}

export function normalizeRuntimeDocMarkdown(markdown, options) {
  const stripped = stripFrontmatter(markdown)

  return transformOutsideCodeFences(stripped, (segment) => {
    let next = replaceVitePressComponents(segment, options.locale)
    next = rewriteDetailsContainers(next)
    next = rewriteMarkdownLinks(next, options.routeSet)
    next = rewriteHtmlAttributes(next, options.routeSet)
    return next
  }).trim()
}

export function stripFrontmatter(markdown) {
  if (!markdown.startsWith('---\n') && !markdown.startsWith('---\r\n')) {
    return markdown
  }

  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
}

function renderRootRuntimeDoc(locale) {
  if (locale === 'zh-Hans') {
    return [
      '# MDP Server 内置文档',
      '',
      '这个 server 提供两类能力：',
      '',
      '- 固定的 MCP bridge tools，供 host 先发现 client，再按 path 调用。',
      '- 传输与探测路由，供 MDP client 建链、鉴权、注册目录和读取 skill。',
      '',
      '## 建议先这样用 MCP bridge tools',
      '',
      '1. `listClients` 查看当前在线的 MDP clients。',
      '2. `listPaths` 找到目标 client、`method` 和 canonical path。',
      '3. `callPath` 调用一个确定 client 的一个确定 path。',
      '4. `callPaths` 把同一个 path fan-out 到多个 client。',
      '',
      '## 当前可访问的 transport 和 HTTP 路由',
      '',
      '- WebSocket session: `ws://<host>:<port>`',
      '- HTTP loop: `POST /mdp/http-loop/connect`、`POST /mdp/http-loop/send`、`GET /mdp/http-loop/poll`、`POST /mdp/http-loop/disconnect`',
      '- Auth bootstrap: `POST /mdp/auth`、`DELETE /mdp/auth`',
      '- Server metadata: `GET /mdp/meta`',
      '- Skill 直读路由: `GET /skills/:clientId/*skillPath`、`GET /:clientId/skills/*skillPath`',
      '',
      '## 下一步阅读',
      '',
      '- [/zh-Hans/server/tools/SKILL.md](/zh-Hans/server/tools/SKILL.md)',
      '- [/zh-Hans/server/api/SKILL.md](/zh-Hans/server/api/SKILL.md)',
      '- [/zh-Hans/guide/quick-start/SKILL.md](/zh-Hans/guide/quick-start/SKILL.md)',
      '- [/zh-Hans/protocol/overview/SKILL.md](/zh-Hans/protocol/overview/SKILL.md)',
      '- [/zh-Hans/sdk/javascript/quick-start/SKILL.md](/zh-Hans/sdk/javascript/quick-start/SKILL.md)',
      '- [/zh-Hans/playground/SKILL.md](/zh-Hans/playground/SKILL.md)'
    ].join('\n')
  }

  return [
    '# MDP Server Runtime Docs',
    '',
    'This server exposes two complementary surfaces:',
    '',
    '- fixed MCP bridge tools for hosts',
    '- transport and discovery routes for MDP clients',
    '',
    '## Recommended bridge tool flow',
    '',
    '1. `listClients` shows which MDP clients are currently online.',
    '2. `listPaths` lets you inspect each client path catalog and find the exact target.',
    '3. `callPath` invokes one exact `method + path` on one exact client.',
    '4. `callPaths` fans the same invocation out to multiple clients.',
    '',
    '## Transport and HTTP routes',
    '',
    '- WebSocket session: `ws://<host>:<port>`',
    '- HTTP loop: `POST /mdp/http-loop/connect`, `POST /mdp/http-loop/send`, `GET /mdp/http-loop/poll`, `POST /mdp/http-loop/disconnect`',
    '- Auth bootstrap: `POST /mdp/auth`, `DELETE /mdp/auth`',
    '- Server metadata probe: `GET /mdp/meta`',
    '- Direct skill reads: `GET /skills/:clientId/*skillPath`, `GET /:clientId/skills/*skillPath`',
    '',
    '## Read next',
    '',
    '- [/server/tools/SKILL.md](/server/tools/SKILL.md)',
    '- [/server/api/SKILL.md](/server/api/SKILL.md)',
    '- [/guide/quick-start/SKILL.md](/guide/quick-start/SKILL.md)',
    '- [/protocol/overview/SKILL.md](/protocol/overview/SKILL.md)',
    '- [/sdk/javascript/quick-start/SKILL.md](/sdk/javascript/quick-start/SKILL.md)',
    '- [/playground/SKILL.md](/playground/SKILL.md)'
  ].join('\n')
}

async function listMarkdownFiles(rootDir) {
  const entries = await readdir(rootDir, {
    recursive: true,
    withFileTypes: true
  })

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => normalizePathSeparators(entry.parentPath
      ? resolve(entry.parentPath, entry.name).slice(rootDir.length + 1)
      : entry.name))
}

function transformOutsideCodeFences(markdown, transform) {
  return markdown
    .split(/(```[\s\S]*?```)/g)
    .map((segment) => (segment.startsWith('```') ? segment : transform(segment)))
    .join('')
}

function replaceVitePressComponents(markdown, locale) {
  return markdown
    .replace(
      /<SharedMermaidDiagram\s+name="([^"]+)"\s*\/>/g,
      (_match, name) => locale === 'zh-Hans'
        ? [
            '> 此处原本是一个 Mermaid 图示，runtime docs 不渲染 VitePress 组件。',
            '>',
            `> 图示标识：\`${name}\`。如需查看渲染后的图，请打开仓库文档站。`
          ].join('\n')
        : [
            '> This section uses a Mermaid diagram component that is not rendered in runtime docs.',
            '>',
            `> Diagram id: \`${name}\`. Open the repository docs site if you need the rendered diagram.`
          ].join('\n')
    )
    .replace(
      /<MermaidDiagram[^>]*\/>/g,
      locale === 'zh-Hans'
        ? '> 此处原本是一个 Mermaid 图示，runtime docs 不渲染 VitePress 组件。'
        : '> This section uses a Mermaid diagram that is not rendered in runtime docs.'
    )
}

function rewriteDetailsContainers(markdown) {
  const lines = markdown.split(/\r?\n/)
  const rewritten = lines.map((line) => {
    const trimmed = line.trim()

    if (trimmed.startsWith(':::: details ')) {
      return `## ${trimmed.slice(':::: details '.length).trim()}`
    }

    if (trimmed.startsWith('::: details ')) {
      return `## ${trimmed.slice('::: details '.length).trim()}`
    }

    if (trimmed === ':::' || trimmed === '::::') {
      return ''
    }

    return line
  })

  return rewritten.join('\n').replace(/\n{3,}/g, '\n\n')
}

function rewriteMarkdownLinks(markdown, routeSet) {
  return markdown.replace(
    /(!?)\[([^\]]+)\]\((\/[^)\s]+)\)/g,
    (_match, imagePrefix, label, target) => {
      const resolvedTarget = resolveInternalRuntimeDocTarget(target, routeSet)

      if (resolvedTarget) {
        return `${imagePrefix}[${label}](${resolvedTarget})`
      }

      if (imagePrefix === '!') {
        return `${imagePrefix}[${label}](${target})`
      }

      return renderUnresolvedInternalLink(label, target)
    }
  )
}

function rewriteHtmlAttributes(markdown, routeSet) {
  return markdown.replace(
    /\b(href|src)=(["'])(\/[^"']*)\2/g,
    (_match, attribute, quote, target) => {
      const resolvedTarget = resolveInternalRuntimeDocTarget(target, routeSet)

      return `${attribute}=${quote}${resolvedTarget ?? target}${quote}`
    }
  )
}

function resolveInternalRuntimeDocTarget(target, routeSet) {
  if (!target.startsWith('/') || target.startsWith('//')) {
    return undefined
  }

  const match = target.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/)

  if (!match) {
    return undefined
  }

  const path = trimTrailingSlash(match[1] || '/') || '/'
  const query = match[2] ?? ''
  const hash = match[3] ?? ''
  const candidate = path === '/'
    ? '/SKILL.md'
    : path.endsWith('/SKILL.md')
      ? path
      : `${path}/SKILL.md`

  if (!routeSet.has(candidate)) {
    return undefined
  }

  return `${candidate}${query}${hash}`
}

function renderUnresolvedInternalLink(label, target) {
  if (label === target) {
    return `\`${target}\``
  }

  return `${label} (\`${target}\`)`
}

function trimTrailingSlash(value) {
  if (value === '/') {
    return value
  }

  return value.endsWith('/') ? value.slice(0, -1) : value
}

function ensureTrailingNewline(value) {
  return value.endsWith('\n') ? value : `${value}\n`
}

function isRootRuntimeDoc(relativeSourcePath) {
  return relativeSourcePath === 'index.md' || relativeSourcePath === 'zh-Hans/index.md'
}

function normalizePathSeparators(value) {
  return value.replaceAll('\\', '/')
}
