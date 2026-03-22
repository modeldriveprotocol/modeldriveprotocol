import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export type SetupScope = 'user' | 'project'
export type SetupTarget = 'claude' | 'codex' | 'cursor'

export interface SetupOptions {
  scope: SetupScope
  targets: SetupTarget[]
  name: string
  dryRun: boolean
}

export interface SetupResult {
  target: SetupTarget
  status: 'configured' | 'skipped'
  detail: string
}

interface SetupIo {
  info(message: string): void
  error(message: string): void
}

interface SetupDeps {
  cwd: string
  homeDir: string
  readTextFile(filePath: string): Promise<string>
  writeTextFile(filePath: string, content: string): Promise<void>
  ensureDir(directoryPath: string): Promise<void>
  runCommand(command: string, args: string[]): Promise<void>
}

interface LauncherConfig {
  command: string
  args: string[]
}

const defaultSetupIo: SetupIo = {
  info: (message) => {
    console.log(message)
  },
  error: (message) => {
    console.error(message)
  }
}

const defaultSetupDeps: SetupDeps = {
  cwd: process.cwd(),
  homeDir: homedir(),
  readTextFile: async (filePath) => {
    return await readFile(filePath, 'utf8')
  },
  writeTextFile: async (filePath, content) => {
    await writeFile(filePath, content, 'utf8')
  },
  ensureDir: async (directoryPath) => {
    await mkdir(directoryPath, { recursive: true })
  },
  runCommand: async (command, args) => {
    await execFileAsync(command, args)
  }
}

export interface SetupParseResult {
  helpRequested: boolean
  options: SetupOptions
}

export function parseSetupArgs(argv: string[]): SetupParseResult {
  const selectedTargets = new Set<SetupTarget>()
  const options: SetupOptions = {
    scope: 'user',
    targets: [],
    name: 'mdp',
    dryRun: false
  }
  let helpRequested = false

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]

    if (!value) {
      continue
    }

    if (value === '--help' || value === '-h') {
      helpRequested = true
      continue
    }

    if (value === '--claude') {
      selectedTargets.add('claude')
      continue
    }

    if (value === '--codex') {
      selectedTargets.add('codex')
      continue
    }

    if (value === '--cursor') {
      selectedTargets.add('cursor')
      continue
    }

    if (value === '--scope') {
      const nextValue = requireSetupOptionValue(argv, index)
      if (nextValue !== 'user' && nextValue !== 'project') {
        throw new Error(`Unsupported setup scope: ${nextValue}`)
      }

      options.scope = nextValue
      index += 1
      continue
    }

    if (value === '--name') {
      options.name = requireSetupOptionValue(argv, index)
      index += 1
      continue
    }

    if (value === '--dry-run') {
      options.dryRun = true
      continue
    }

    if (value.startsWith('-')) {
      throw new Error(`Unknown setup option: ${value}`)
    }

    throw new Error(`Unexpected setup argument: ${value}`)
  }

  options.targets = selectedTargets.size > 0
    ? [...selectedTargets]
    : ['claude', 'codex', 'cursor']

  return {
    helpRequested,
    options
  }
}

export async function runSetupCommand(
  options: SetupOptions,
  io: SetupIo = defaultSetupIo,
  deps: SetupDeps = defaultSetupDeps
): Promise<SetupResult[]> {
  const results: SetupResult[] = []

  for (const target of options.targets) {
    if (target === 'claude') {
      results.push(await configureClaude(options, deps))
      continue
    }

    if (target === 'codex') {
      results.push(await configureCodex(options, deps))
      continue
    }

    results.push(await configureCursor(options, deps))
  }

  for (const result of results) {
    const writer = result.status === 'configured' ? io.info : io.error
    writer(`${result.target}: ${result.detail}`)
  }

  if (results.every((result) => result.status === 'skipped')) {
    throw new Error('MDP setup did not configure any supported host')
  }

  return results
}

export function renderSetupHelpText(): string {
  return [
    'Usage: modeldriveprotocol-server setup [options]',
    '',
    'Options:',
    '  --claude          Configure Claude Code',
    '  --codex           Configure Codex',
    '  --cursor          Configure Cursor',
    '  --scope <scope>   Setup scope: user or project (default: user)',
    '  --name <name>     MCP server entry name (default: mdp)',
    '  --dry-run         Print actions without changing any config',
    '  -h, --help        Show setup help text'
  ].join('\n')
}

async function configureClaude(
  options: SetupOptions,
  deps: SetupDeps
): Promise<SetupResult> {
  const launcher = await resolveLauncherConfig(options.scope, deps)
  const args = [
    'mcp',
    'add',
    '--scope',
    options.scope,
    options.name,
    '--',
    launcher.command,
    ...launcher.args
  ]

  if (options.dryRun) {
    return {
      target: 'claude',
      status: 'configured',
      detail: `would run \`claude ${args.join(' ')}\``
    }
  }

  try {
    await deps.runCommand('claude', args)
    return {
      target: 'claude',
      status: 'configured',
      detail: `configured ${options.scope}-scope MCP entry \`${options.name}\``
    }
  } catch (error) {
    if (isMissingCommandError(error)) {
      return {
        target: 'claude',
        status: 'skipped',
        detail: 'Claude CLI not found; use the manual install guide instead'
      }
    }

    throw error
  }
}

async function configureCodex(
  options: SetupOptions,
  deps: SetupDeps
): Promise<SetupResult> {
  const launcher = await resolveLauncherConfig(options.scope, deps)
  const configFilePath = options.scope === 'project'
    ? path.join(deps.cwd, '.codex', 'config.toml')
    : path.join(deps.homeDir, '.codex', 'config.toml')
  const section = [
    `[mcp_servers.${options.name}]`,
    `command = ${JSON.stringify(launcher.command)}`,
    `args = ${JSON.stringify(launcher.args)}`
  ].join('\n')
  const nextContent = await updateTomlSection(configFilePath, options.name, section, deps)

  if (options.dryRun) {
    return {
      target: 'codex',
      status: 'configured',
      detail: `would write ${configFilePath}`
    }
  }

  await deps.ensureDir(path.dirname(configFilePath))
  await deps.writeTextFile(configFilePath, nextContent)

  return {
    target: 'codex',
    status: 'configured',
    detail: `updated ${configFilePath}`
  }
}

async function configureCursor(
  options: SetupOptions,
  deps: SetupDeps
): Promise<SetupResult> {
  const launcher = await resolveLauncherConfig(options.scope, deps)
  const configFilePath = options.scope === 'project'
    ? path.join(deps.cwd, '.cursor', 'mcp.json')
    : path.join(deps.homeDir, '.cursor', 'mcp.json')
  const existing = await readJsonObject(configFilePath, deps)
  const mcpServers = isPlainObject(existing.mcpServers) ? existing.mcpServers : {}
  const nextConfig = {
    ...existing,
    mcpServers: {
      ...mcpServers,
      [options.name]: {
        command: launcher.command,
        args: launcher.args
      }
    }
  }
  const serialized = `${JSON.stringify(nextConfig, null, 2)}\n`

  if (options.dryRun) {
    return {
      target: 'cursor',
      status: 'configured',
      detail: `would write ${configFilePath}`
    }
  }

  await deps.ensureDir(path.dirname(configFilePath))
  await deps.writeTextFile(configFilePath, serialized)

  return {
    target: 'cursor',
    status: 'configured',
    detail: `updated ${configFilePath}`
  }
}

async function updateTomlSection(
  filePath: string,
  sectionName: string,
  sectionBody: string,
  deps: SetupDeps
): Promise<string> {
  const existing = await readOptionalTextFile(filePath, deps)
  const normalizedSectionBody = `${sectionBody}\n`
  const header = `[mcp_servers.${sectionName}]`
  const sectionPattern = new RegExp(
    `^\\[mcp_servers\\.${escapeRegExp(sectionName)}\\]\\n(?:.*\\n)*?(?=^\\[|\\Z)`,
    'm'
  )

  if (!existing) {
    return normalizedSectionBody
  }

  if (sectionPattern.test(existing)) {
    return ensureTrailingNewline(existing.replace(sectionPattern, normalizedSectionBody))
  }

  return ensureTrailingNewline(`${existing.trimEnd()}\n\n${normalizedSectionBody}`)
}

async function readJsonObject(
  filePath: string,
  deps: SetupDeps
): Promise<Record<string, unknown>> {
  const existing = await readOptionalTextFile(filePath, deps)

  if (!existing) {
    return {}
  }

  const parsed = JSON.parse(existing) as unknown
  if (!isPlainObject(parsed)) {
    throw new Error(`Cursor MCP config at ${filePath} must be a JSON object`)
  }

  return parsed
}

async function readOptionalTextFile(
  filePath: string,
  deps: SetupDeps
): Promise<string | undefined> {
  try {
    return await deps.readTextFile(filePath)
  } catch (error) {
    if (isMissingFileError(error)) {
      return undefined
    }

    throw error
  }
}

function requireSetupOptionValue(argv: string[], index: number): string {
  const option = argv[index]
  const nextValue = argv[index + 1]

  if (!option || !nextValue || nextValue.startsWith('-')) {
    throw new Error(`Option ${option ?? 'unknown'} requires a value`)
  }

  return nextValue
}

function ensureTrailingNewline(content: string): string {
  return content.endsWith('\n') ? content : `${content}\n`
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isMissingCommandError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'ENOENT'
  )
}

function isMissingFileError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'ENOENT'
  )
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function resolveLauncherConfig(
  scope: SetupScope,
  deps: SetupDeps
): Promise<LauncherConfig> {
  const localLauncherPath = path.join(deps.cwd, 'scripts', 'run-local-mdp-mcp.mjs')

  if (await pathExists(localLauncherPath)) {
    return {
      command: 'node',
      args: [scope === 'project' ? path.join('scripts', 'run-local-mdp-mcp.mjs') : localLauncherPath]
    }
  }

  return {
    command: 'npx',
    args: ['-y', '@modeldriveprotocol/server']
  }
}
