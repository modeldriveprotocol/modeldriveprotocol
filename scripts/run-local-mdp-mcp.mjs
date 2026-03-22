#!/usr/bin/env node

import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const serverEntrypoint = path.join(repoRoot, 'packages/server/dist/cli.js')

let activeChild

run().catch((error) => {
  process.stderr.write(`${formatError(error)}\n`)
  process.exit(1)
})

async function run() {
  await runQuietCommand('pnpm', ['--filter', '@modeldriveprotocol/server', 'build'], {
    cwd: repoRoot
  })

  activeChild = spawn(process.execPath, [serverEntrypoint, ...process.argv.slice(2)], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env
  })

  forwardSignals(activeChild)

  activeChild.on('error', (error) => {
    process.stderr.write(`Failed to start local MDP MCP server: ${formatError(error)}\n`)
    process.exit(1)
  })

  activeChild.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }

    process.exit(code ?? 1)
  })
}

function forwardSignals(child) {
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(signal, () => {
      if (!child.killed) {
        child.kill(signal)
      }
    })
  }
}

function formatError(error) {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

function runQuietCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }

      if (stdout) {
        process.stderr.write(stdout)
      }

      if (stderr) {
        process.stderr.write(stderr)
      }

      reject(new Error(
        signal
          ? `${command} ${args.join(' ')} terminated with signal ${signal}`
          : `${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`
      ))
    })
  })
}
