import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  renderCliHelpMarkdown,
  renderCliOptionsMarkdown
} from '../src/cli-reference.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(currentDir, '../../..')

describe('cli reference docs', () => {
  it('keeps the english CLI reference generated blocks in sync', async () => {
    const document = await readDoc('docs/server/cli.md')

    expect(extractGeneratedBlock(document, 'cli-help')).toBe(renderCliHelpMarkdown())
    expect(extractGeneratedBlock(document, 'core-options')).toBe(
      renderCliOptionsMarkdown('core', 'en')
    )
    expect(extractGeneratedBlock(document, 'cluster-options')).toBe(
      renderCliOptionsMarkdown('cluster', 'en')
    )
  })

  it('keeps the chinese CLI reference generated blocks in sync', async () => {
    const document = await readDoc('docs/zh-Hans/server/cli.md')

    expect(extractGeneratedBlock(document, 'cli-help')).toBe(renderCliHelpMarkdown())
    expect(extractGeneratedBlock(document, 'core-options')).toBe(
      renderCliOptionsMarkdown('core', 'zh-Hans')
    )
    expect(extractGeneratedBlock(document, 'cluster-options')).toBe(
      renderCliOptionsMarkdown('cluster', 'zh-Hans')
    )
  })
})

async function readDoc(relativePath: string): Promise<string> {
  const absolutePath = path.join(repoRoot, relativePath)
  return await readFile(absolutePath, 'utf8')
}

function extractGeneratedBlock(document: string, name: string): string {
  const startMarker = `<!-- GENERATED:${name}:start -->`
  const endMarker = `<!-- GENERATED:${name}:end -->`
  const startIndex = document.indexOf(startMarker)
  const endIndex = document.indexOf(endMarker)

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(`Missing generated block: ${name}`)
  }

  return document
    .slice(startIndex + startMarker.length, endIndex)
    .trim()
}
