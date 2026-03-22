import { access } from 'node:fs/promises'
import { spawn } from 'node:child_process'

import { paths } from '../config.mjs'

export async function ensureLocalArtifacts() {
  if (!(await pathExists(paths.serverCliPath))) {
    await runLocalBuild('@modeldriveprotocol/server')
  }

  if (!(await pathExists(paths.runtimeIndexPath))) {
    await runLocalBuild('@modeldriveprotocol/nodejs-simple-mdp-client')
  }
}

async function pathExists(filePath) {
  try {
    await access(filePath)
    return true
  }
  catch {
    return false
  }
}

async function runLocalBuild(filter) {
  await new Promise((resolve, reject) => {
    const child = spawn(
      'pnpm',
      ['--filter', filter, 'build'],
      {
        cwd: paths.repoRoot,
        stdio: ['ignore', 'inherit', 'inherit']
      }
    )

    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`Failed to build ${filter}`))
    })
  })
}
