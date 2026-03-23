import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  parseSetupArgs,
  renderSetupHelpText,
  runSetupCommand
} from '../src/setup.js'

describe('setup command', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults to configuring the common hosts', () => {
    expect(parseSetupArgs([])).toEqual({
      helpRequested: false,
      options: {
        scope: 'user',
        targets: ['claude', 'codex', 'cursor'],
        name: 'mdp',
        dryRun: false
      }
    })
  })

  it('parses explicit targets and project scope', () => {
    expect(parseSetupArgs(['--cursor', '--claude', '--scope', 'project', '--dry-run'])).toEqual({
      helpRequested: false,
      options: {
        scope: 'project',
        targets: ['cursor', 'claude'],
        name: 'mdp',
        dryRun: true
      }
    })
  })

  it('renders setup help', () => {
    expect(renderSetupHelpText()).toContain('Usage: modeldriveprotocol-server setup [options]')
    expect(renderSetupHelpText()).toContain('--cursor')
    expect(renderSetupHelpText()).toContain('--dry-run')
  })

  it('updates user-scope Codex and Cursor config and runs Claude setup', async () => {
    const sandbox = await createSandbox()
    const runCommand = vi.fn(async () => {})

    const results = await runSetupCommand(
      {
        scope: 'user',
        targets: ['claude', 'codex', 'cursor'],
        name: 'mdp',
        dryRun: false
      },
      silentIo(),
      {
        cwd: sandbox.cwd,
        homeDir: sandbox.homeDir,
        readTextFile: async (filePath) => await readFile(filePath, 'utf8'),
        writeTextFile: sandbox.writeTextFile,
        ensureDir: sandbox.ensureDir,
        runCommand
      }
    )

    expect(results).toEqual([
      {
        target: 'claude',
        status: 'configured',
        detail: 'configured user-scope MCP entry `mdp`'
      },
      {
        target: 'codex',
        status: 'configured',
        detail: `updated ${path.join(sandbox.homeDir, '.codex', 'config.toml')}`
      },
      {
        target: 'cursor',
        status: 'configured',
        detail: `updated ${path.join(sandbox.homeDir, '.cursor', 'mcp.json')}`
      }
    ])
    expect(runCommand).toHaveBeenCalledWith('claude', [
      'mcp',
      'add',
      '--scope',
      'user',
      'mdp',
      '--',
      'npx',
      '-y',
      '@modeldriveprotocol/server'
    ])

    const codexConfig = await readFile(path.join(sandbox.homeDir, '.codex', 'config.toml'), 'utf8')
    expect(codexConfig).toContain('[mcp_servers.mdp]')
    expect(codexConfig).toContain('command = "npx"')

    const cursorConfig = JSON.parse(
      await readFile(path.join(sandbox.homeDir, '.cursor', 'mcp.json'), 'utf8')
    ) as { mcpServers: Record<string, { command: string, args: string[] }> }
    expect(cursorConfig.mcpServers.mdp).toEqual({
      command: 'npx',
      args: ['-y', '@modeldriveprotocol/server']
    })
  })

  it('writes project-scope Codex and Cursor config', async () => {
    const sandbox = await createSandbox()
    const runCommand = vi.fn(async () => {})

    const results = await runSetupCommand(
      {
        scope: 'project',
        targets: ['claude', 'codex', 'cursor'],
        name: 'mdp',
        dryRun: false
      },
      silentIo(),
      {
        cwd: sandbox.cwd,
        homeDir: sandbox.homeDir,
        readTextFile: async (filePath) => await readFile(filePath, 'utf8'),
        writeTextFile: sandbox.writeTextFile,
        ensureDir: sandbox.ensureDir,
        runCommand
      }
    )

    expect(results[0]).toEqual({
      target: 'claude',
      status: 'configured',
      detail: 'configured project-scope MCP entry `mdp`'
    })
    expect(results[1]).toEqual({
      target: 'codex',
      status: 'configured',
      detail: `updated ${path.join(sandbox.cwd, '.codex', 'config.toml')}`
    })
    expect(results[2]).toEqual({
      target: 'cursor',
      status: 'configured',
      detail: `updated ${path.join(sandbox.cwd, '.cursor', 'mcp.json')}`
    })

    const cursorConfig = JSON.parse(
      await readFile(path.join(sandbox.cwd, '.cursor', 'mcp.json'), 'utf8')
    ) as { mcpServers: Record<string, { command: string, args: string[] }> }
    expect(cursorConfig.mcpServers.mdp.args).toEqual(['-y', '@modeldriveprotocol/server'])

    const codexConfig = await readFile(path.join(sandbox.cwd, '.codex', 'config.toml'), 'utf8')
    expect(codexConfig).toContain('[mcp_servers.mdp]')
    expect(codexConfig).toContain('command = "npx"')
  })

  it('skips Claude when the CLI is missing and still configures file-based hosts', async () => {
    const sandbox = await createSandbox()

    const results = await runSetupCommand(
      {
        scope: 'user',
        targets: ['claude', 'codex'],
        name: 'mdp',
        dryRun: false
      },
      silentIo(),
      {
        cwd: sandbox.cwd,
        homeDir: sandbox.homeDir,
        readTextFile: async (filePath) => await readFile(filePath, 'utf8'),
        writeTextFile: sandbox.writeTextFile,
        ensureDir: sandbox.ensureDir,
        runCommand: async () => {
          const error = new Error('missing command') as Error & { code: string }
          error.code = 'ENOENT'
          throw error
        }
      }
    )

    expect(results[0]).toEqual({
      target: 'claude',
      status: 'skipped',
      detail: 'Claude CLI not found; use the manual install guide instead'
    })
    expect(results[1]?.status).toBe('configured')
  })

  it('prefers the local repo launcher when present', async () => {
    const sandbox = await createSandbox({ withLocalLauncher: true })
    const runCommand = vi.fn(async () => {})

    const results = await runSetupCommand(
      {
        scope: 'project',
        targets: ['claude', 'codex', 'cursor'],
        name: 'mdp',
        dryRun: false
      },
      silentIo(),
      {
        cwd: sandbox.cwd,
        homeDir: sandbox.homeDir,
        readTextFile: async (filePath) => await readFile(filePath, 'utf8'),
        writeTextFile: sandbox.writeTextFile,
        ensureDir: sandbox.ensureDir,
        runCommand
      }
    )

    expect(results.map((result) => result.status)).toEqual(['configured', 'configured', 'configured'])
    expect(runCommand).toHaveBeenCalledWith('claude', [
      'mcp',
      'add',
      '--scope',
      'project',
      'mdp',
      '--',
      'node',
      path.join('scripts', 'run-local-mdp-mcp.mjs')
    ])

    const codexConfig = await readFile(path.join(sandbox.cwd, '.codex', 'config.toml'), 'utf8')
    expect(codexConfig).toContain('command = "node"')
    expect(codexConfig).toContain('"scripts/run-local-mdp-mcp.mjs"')

    const cursorConfig = JSON.parse(
      await readFile(path.join(sandbox.cwd, '.cursor', 'mcp.json'), 'utf8')
    ) as { mcpServers: Record<string, { command: string, args: string[] }> }
    expect(cursorConfig.mcpServers.mdp).toEqual({
      command: 'node',
      args: [path.join('scripts', 'run-local-mdp-mcp.mjs')]
    })
  })

  it('uses an absolute local launcher path for user-scope config when running inside the repo', async () => {
    const sandbox = await createSandbox({ withLocalLauncher: true })
    const runCommand = vi.fn(async () => {})
    const launcherPath = path.join(sandbox.cwd, 'scripts', 'run-local-mdp-mcp.mjs')

    await runSetupCommand(
      {
        scope: 'user',
        targets: ['claude', 'codex', 'cursor'],
        name: 'mdp',
        dryRun: false
      },
      silentIo(),
      {
        cwd: sandbox.cwd,
        homeDir: sandbox.homeDir,
        readTextFile: async (filePath) => await readFile(filePath, 'utf8'),
        writeTextFile: sandbox.writeTextFile,
        ensureDir: sandbox.ensureDir,
        runCommand
      }
    )

    expect(runCommand).toHaveBeenCalledWith('claude', [
      'mcp',
      'add',
      '--scope',
      'user',
      'mdp',
      '--',
      'node',
      launcherPath
    ])

    const codexConfig = await readFile(path.join(sandbox.homeDir, '.codex', 'config.toml'), 'utf8')
    expect(codexConfig).toContain('command = "node"')
    expect(codexConfig).toContain(JSON.stringify([launcherPath]))

    const cursorConfig = JSON.parse(
      await readFile(path.join(sandbox.homeDir, '.cursor', 'mcp.json'), 'utf8')
    ) as { mcpServers: Record<string, { command: string, args: string[] }> }
    expect(cursorConfig.mcpServers.mdp).toEqual({
      command: 'node',
      args: [launcherPath]
    })
  })
})

async function createSandbox(options?: { withLocalLauncher?: boolean }): Promise<{
  cwd: string
  homeDir: string
  ensureDir: (directoryPath: string) => Promise<void>
  writeTextFile: (filePath: string, content: string) => Promise<void>
}> {
  const root = await mkdtemp(path.join(tmpdir(), 'mdp-setup-test-'))
  const cwd = path.join(root, 'workspace')
  const homeDir = path.join(root, 'home')

  await Promise.all([
    mkdir(cwd, { recursive: true }),
    mkdir(homeDir, { recursive: true })
  ])

  if (options?.withLocalLauncher) {
    const launcherPath = path.join(cwd, 'scripts', 'run-local-mdp-mcp.mjs')
    await mkdir(path.dirname(launcherPath), { recursive: true })
    await writeFile(launcherPath, '#!/usr/bin/env node\n', 'utf8')
  }

  return {
    cwd,
    homeDir,
    ensureDir: async (directoryPath) => {
      await mkdir(directoryPath, { recursive: true })
    },
    writeTextFile: async (filePath, content) => {
      await writeFile(filePath, content, 'utf8')
    }
  }
}

function silentIo() {
  return {
    info: vi.fn(),
    error: vi.fn()
  }
}
