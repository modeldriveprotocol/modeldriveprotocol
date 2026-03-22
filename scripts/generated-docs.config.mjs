import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export async function loadGeneratedDocsTargets(root) {
  const cliReference = await loadCliReference(root)

  return [
    createCliReferenceTarget({
      root,
      displayPath: 'docs/server/cli.md',
      locale: 'en',
      cliReference
    }),
    createCliReferenceTarget({
      root,
      displayPath: 'docs/zh-Hans/server/cli.md',
      locale: 'zh-Hans',
      cliReference
    })
  ]
}

async function loadCliReference(root) {
  const cliReferenceUrl = pathToFileURL(
    resolve(root, 'packages/server/dist/cli-reference.js')
  ).href

  try {
    return await import(cliReferenceUrl)
  } catch (error) {
    throw new Error(
      'Unable to load packages/server/dist/cli-reference.js. Run `pnpm build` before syncing docs.',
      { cause: error }
    )
  }
}

function createCliReferenceTarget({ root, displayPath, locale, cliReference }) {
  return {
    filePath: resolve(root, displayPath),
    displayPath,
    blocks: [
      {
        name: 'cli-help',
        content: cliReference.renderCliHelpMarkdown()
      },
      {
        name: 'core-options',
        content: cliReference.renderCliOptionsMarkdown('core', locale)
      },
      {
        name: 'cluster-options',
        content: cliReference.renderCliOptionsMarkdown('cluster', locale)
      }
    ]
  }
}
