#!/usr/bin/env node

import process from 'node:process'

import { bootNodejsSimpleMdpClient } from './index.js'

interface CliOptions {
  helpRequested: boolean
  serverUrl?: string
  workspaceRoot?: string
  clientId?: string
  clientName?: string
}

async function main(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2))

  if (options.helpRequested) {
    process.stdout.write(`${renderHelpText()}\n`)
    return
  }

  const client = await bootNodejsSimpleMdpClient({
    ...(options.serverUrl ? { serverUrl: options.serverUrl } : {}),
    ...(options.workspaceRoot ? { workspaceRoot: options.workspaceRoot } : {}),
    client: {
      ...(options.clientId ? { id: options.clientId } : {}),
      ...(options.clientName ? { name: options.clientName } : {})
    }
  })

  process.stdout.write(
    `registered ${client.describe().name} (${client.describe().id}) against ${options.serverUrl ?? 'ws://127.0.0.1:47372'}\n`
  )

  const shutdown = async () => {
    await client.disconnect()
    process.exit(0)
  }

  process.once('SIGINT', () => {
    void shutdown()
  })
  process.once('SIGTERM', () => {
    void shutdown()
  })
}

function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    helpRequested: false
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]

    if (value === '--help' || value === '-h') {
      options.helpRequested = true
      continue
    }

    if (value === '--server-url') {
      options.serverUrl = requireValue(argv, index)
      index += 1
      continue
    }

    if (value === '--workspace-root') {
      options.workspaceRoot = requireValue(argv, index)
      index += 1
      continue
    }

    if (value === '--client-id') {
      options.clientId = requireValue(argv, index)
      index += 1
      continue
    }

    if (value === '--client-name') {
      options.clientName = requireValue(argv, index)
      index += 1
      continue
    }

    throw new Error(`Unknown option: ${value}`)
  }

  return options
}

function requireValue(argv: string[], index: number): string {
  const nextValue = argv[index + 1]

  if (!nextValue) {
    throw new Error(`Missing value for ${argv[index]}`)
  }

  return nextValue
}

function renderHelpText(): string {
  return [
    'Usage: nodejs-simple-mdp-client [options]',
    '',
    'Options:',
    '  --server-url <url>        MDP server URL (default: ws://127.0.0.1:47372)',
    '  --workspace-root <path>   Workspace root override',
    '  --client-id <id>          Client identifier override',
    '  --client-name <name>      Client display name override',
    '  -h, --help                Show help text'
  ].join('\n')
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exit(1)
})
