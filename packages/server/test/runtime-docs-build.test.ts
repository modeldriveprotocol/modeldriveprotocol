import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  buildRuntimeDocs,
  defaultRuntimeDocsPaths,
  sourcePathToRuntimeDocRoute
} from '../scripts/runtime-docs-lib.mjs'
import {
  chooseRuntimeDocsLocale,
  parseRuntimeDocsRequestPath,
  resolveRuntimeDoc
} from '../src/runtime-docs.js'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.allSettled(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, {
        force: true,
        recursive: true
      })
    )
  )
})

describe('runtime docs build', () => {
  it('maps docs source paths to canonical runtime SKILL routes', () => {
    expect(sourcePathToRuntimeDocRoute('server/tools/index.md')).toEqual({
      locale: 'en',
      route: '/server/tools/SKILL.md',
      contentFile: 'server/tools/SKILL.md'
    })
    expect(sourcePathToRuntimeDocRoute('guide/quick-start.md')).toEqual({
      locale: 'en',
      route: '/guide/quick-start/SKILL.md',
      contentFile: 'guide/quick-start/SKILL.md'
    })
    expect(sourcePathToRuntimeDocRoute('zh-Hans/server/api/index.md')).toEqual({
      locale: 'zh-Hans',
      route: '/zh-Hans/server/api/SKILL.md',
      contentFile: 'zh-Hans/server/api/SKILL.md'
    })
  })

  it('covers every docs markdown source and generates root templates', async () => {
    const outputDir = await createTemporaryOutputDir()
    const manifest = await buildRuntimeDocs({
      ...defaultRuntimeDocsPaths(),
      outputDir
    })
    const expectedSources = (await listMarkdownSources(defaultRuntimeDocsPaths().docsDir))
      .map((sourcePath) => `docs/${sourcePath}`)
      .sort((left, right) => left.localeCompare(right))
    const actualSources = manifest.documents
      .map((document) => document.sourcePath)
      .sort((left, right) => left.localeCompare(right))

    expect(actualSources).toEqual(expectedSources)
    await expect(readFile(path.join(outputDir, 'SKILL.md'), 'utf8')).resolves.toContain(
      '# MDP Server Runtime Docs'
    )
    await expect(
      readFile(path.join(outputDir, 'zh-Hans/SKILL.md'), 'utf8')
    ).resolves.toContain('# MDP Server 内置文档')
  })

  it('normalizes markdown for runtime use', async () => {
    const outputDir = await createTemporaryOutputDir()

    await buildRuntimeDocs({
      ...defaultRuntimeDocsPaths(),
      outputDir
    })

    const toolsDoc = await readFile(path.join(outputDir, 'server/tools/SKILL.md'), 'utf8')
    const architectureDoc = await readFile(
      path.join(outputDir, 'guide/architecture/SKILL.md'),
      'utf8'
    )
    const manualInstallDoc = await readFile(
      path.join(outputDir, 'guide/manual-install/SKILL.md'),
      'utf8'
    )
    const quickStartDoc = await readFile(
      path.join(outputDir, 'guide/quick-start/SKILL.md'),
      'utf8'
    )
    const piAgentDoc = await readFile(
      path.join(outputDir, 'examples/pi-agent-assistant/SKILL.md'),
      'utf8'
    )

    expect(toolsDoc.startsWith('---')).toBe(false)
    expect(toolsDoc).toContain('/server/tools/list-clients/SKILL.md')
    expect(architectureDoc).toContain('Diagram id: `architecture/overview`')
    expect(manualInstallDoc).toContain('## Claude Code')
    expect(manualInstallDoc).not.toContain(':::: details')
    expect(quickStartDoc).toContain('Browser Client (`/examples/browser/index.html`)')
    expect(quickStartDoc).not.toContain('[Browser Client](/examples/browser/index.html)')
    expect(piAgentDoc).toContain('- Live runtime page: `/examples/pi-agent-assistant/index.html`')
    expect(piAgentDoc).not.toContain('](/examples/pi-agent-assistant/index.html)')

    const unresolvedTargets = await findRootRelativeMarkdownLinks(outputDir)

    expect(unresolvedTargets).toEqual([])
  })

  it('resolves aliases and locale preferences against generated docs', async () => {
    const outputDir = await createTemporaryOutputDir()
    const missingOutputDir = path.join(outputDir, 'missing-runtime-docs')

    await buildRuntimeDocs({
      ...defaultRuntimeDocsPaths(),
      outputDir
    })

    expect(parseRuntimeDocsRequestPath('/')).toEqual({
      baseRoute: '/SKILL.md'
    })
    expect(parseRuntimeDocsRequestPath('/server/tools/')).toEqual({
      baseRoute: '/server/tools/SKILL.md'
    })
    expect(parseRuntimeDocsRequestPath('/zh-Hans/server/tools')).toEqual({
      baseRoute: '/server/tools/SKILL.md',
      explicitLocale: 'zh-Hans'
    })
    expect(chooseRuntimeDocsLocale('zh-CN,zh;q=0.9,en;q=0.5')).toBe('zh-Hans')
    expect(chooseRuntimeDocsLocale('zh;q=0.1,en;q=1')).toBe('en')
    expect(chooseRuntimeDocsLocale('en;q=0.1,zh;q=1')).toBe('zh-Hans')
    expect(chooseRuntimeDocsLocale('zh-TW')).toBe('en')
    expect(chooseRuntimeDocsLocale('zh-TW,zh;q=0.9')).toBe('zh-Hans')
    expect(chooseRuntimeDocsLocale('zh-Hant')).toBe('en')
    expect(chooseRuntimeDocsLocale('fr;q=1,zh;q=0.1')).toBe('zh-Hans')
    expect(chooseRuntimeDocsLocale('en-US,en;q=0.8')).toBe('en')

    const preferredChinese = await resolveRuntimeDoc('/server/tools', 'zh-CN,zh;q=0.9', outputDir)
    const weightedEnglish = await resolveRuntimeDoc('/server/tools', 'zh;q=0.1,en;q=1', outputDir)
    const preferredEnglish = await resolveRuntimeDoc('/server/tools', 'en-US,en;q=0.8', outputDir)
    const explicitChinese = await resolveRuntimeDoc(
      '/zh-Hans/server/tools/SKILL.md',
      'en-US,en;q=0.8',
      outputDir
    )
    const missingCatalog = await resolveRuntimeDoc('/server/tools', undefined, missingOutputDir)

    expect(preferredChinese?.route).toBe('/zh-Hans/server/tools/SKILL.md')
    expect(weightedEnglish?.route).toBe('/server/tools/SKILL.md')
    expect(preferredEnglish?.route).toBe('/server/tools/SKILL.md')
    expect(explicitChinese?.route).toBe('/zh-Hans/server/tools/SKILL.md')
    expect(missingCatalog).toBeUndefined()
    await expect(resolveRuntimeDoc('/missing-page', 'zh-CN,zh;q=0.9', outputDir)).resolves.toBeUndefined()
  })
})

async function createTemporaryOutputDir(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'mdp-runtime-docs-test-'))
  temporaryDirectories.push(directory)
  return directory
}

async function listMarkdownSources(rootDir: string): Promise<string[]> {
  const entries = await readdir(rootDir, {
    recursive: true,
    withFileTypes: true
  })

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => {
      const absolutePath = entry.parentPath
        ? path.resolve(entry.parentPath, entry.name)
        : path.resolve(rootDir, entry.name)

      return path.relative(rootDir, absolutePath).split(path.sep).join('/')
    })
}

async function findRootRelativeMarkdownLinks(rootDir: string): Promise<string[]> {
  const markdownFiles = await listMarkdownSources(rootDir)
  const unresolvedTargets = new Set<string>()

  await Promise.all(
    markdownFiles.map(async (relativePath) => {
      const content = await readFile(path.join(rootDir, relativePath), 'utf8')

      for (const match of content.matchAll(/\[[^\]]+\]\((\/[^)\s]+)\)/g)) {
        const target = match[1]
        const pathname = target.split(/[?#]/, 1)[0] ?? target

        if (pathname === '/SKILL.md' || pathname.endsWith('/SKILL.md')) {
          continue
        }

        unresolvedTargets.add(`${relativePath}: ${target}`)
      }
    })
  )

  return [...unresolvedTargets].sort((left, right) => left.localeCompare(right))
}
