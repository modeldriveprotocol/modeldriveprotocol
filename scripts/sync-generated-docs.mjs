import { readFile, writeFile } from 'node:fs/promises'
import { loadGeneratedDocsTargets } from './generated-docs.config.mjs'

const root = process.cwd()
const checkOnly = process.argv.includes('--check')
const targets = await loadGeneratedDocsTargets(root)

const outdatedTargets = []

for (const target of targets) {
  const originalDocument = await readFile(target.filePath, 'utf8')
  const updatedDocument = target.blocks.reduce(
    (document, block) => replaceGeneratedBlock(document, block),
    originalDocument
  )

  if (updatedDocument !== originalDocument) {
    if (checkOnly) {
      outdatedTargets.push(target.displayPath)
    } else {
      await writeFile(target.filePath, updatedDocument)
    }
  }
}

if (checkOnly && outdatedTargets.length > 0) {
  throw new Error(
    `Generated docs are out of date: ${outdatedTargets.join(', ')}. Run \`pnpm docs:sync\`.`
  )
}

function replaceGeneratedBlock(document, block) {
  const { name, content } = block
  const startMarker = `<!-- GENERATED:${name}:start -->`
  const endMarker = `<!-- GENERATED:${name}:end -->`
  const startIndex = document.indexOf(startMarker)
  const endIndex = document.indexOf(endMarker)

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(`Missing generated block: ${name}`)
  }

  const beforeStart = document.slice(0, startIndex)
  const beforeBlock = `${beforeStart.replace(
    new RegExp(`<!-- GENERATED:${escapeRegExp(name)}:source .* -->\\n?`, 'g'),
    ''
  )}${startMarker}`
  const afterBlock = document.slice(endIndex)

  return `${beforeBlock}\n${content}\n${afterBlock}`
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
