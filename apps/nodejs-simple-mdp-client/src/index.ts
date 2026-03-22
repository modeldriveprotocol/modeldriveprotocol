import { access, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  createMdpClient,
  type ClientInfo,
  type ClientTransport,
  type MdpClient
} from '@modeldriveprotocol/client'

type JsonRecord = Record<string, unknown>
type RpcArguments = Record<string, unknown> | undefined
type DependencySectionName =
  | 'dependencies'
  | 'devDependencies'
  | 'peerDependencies'
  | 'optionalDependencies'

interface SimpleClient {
  exposeTool(
    name: string,
    handler: (args: RpcArguments) => unknown | Promise<unknown>,
    options?: {
      description?: string
      inputSchema?: Record<string, unknown>
    }
  ): SimpleClient
  exposeSkill(
    name: string,
    definition: string | (() => Promise<string>),
    options?: {
      description?: string
      contentType?: string
    }
  ): SimpleClient
  connect(): Promise<void>
  register(): void
}

interface PackageManifest extends JsonRecord {
  name?: string
  version?: string
  description?: string
  private?: boolean
  packageManager?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}

export interface NodejsSimpleClientOptions {
  serverUrl?: string
  workspaceRoot?: string
  skillsDir?: string
  client?: Partial<ClientInfo>
  transport?: ClientTransport
}

export interface RegisterNodejsSimpleCapabilitiesOptions {
  workspaceRoot?: string
  skillsDir?: string
}

export interface WorkspacePackageSummary {
  name: string
  version?: string
  description?: string
  private: boolean
  relativeDir: string
  manifestPath: string
}

export interface RuntimeInfo {
  nodeVersion: string
  versions: {
    node?: string
    v8?: string
    uv?: string
    openssl?: string
  }
  platform: NodeJS.Platform
  arch: string
  cwd: string
  workspaceRoot: string
  rootPackage: {
    name?: string
    version?: string
    description?: string
    private?: boolean
    packageManager?: string
  }
  dependencySummary: Record<DependencySectionName, number>
  dependencies: {
    dependencies: Record<string, string>
    devDependencies: Record<string, string>
    peerDependencies: Record<string, string>
    optionalDependencies: Record<string, string>
  }
}

export interface ReadPackageManifestResult {
  workspaceRoot: string
  packageDir: string
  manifestPath: string
  manifest: PackageManifest
}

export interface UpdatePackageManifestResult extends ReadPackageManifestResult {
  changes: {
    nameChanged: boolean
    descriptionChanged: boolean
    dependenciesAdded: string[]
    dependenciesUpdated: string[]
    dependenciesRemoved: string[]
    devDependenciesAdded: string[]
    devDependenciesUpdated: string[]
    devDependenciesRemoved: string[]
    peerDependenciesAdded: string[]
    peerDependenciesUpdated: string[]
    peerDependenciesRemoved: string[]
    optionalDependenciesAdded: string[]
    optionalDependenciesUpdated: string[]
    optionalDependenciesRemoved: string[]
  }
}

const DEFAULT_SERVER_URL = 'ws://127.0.0.1:7070'
const DEFAULT_SKILLS_DIR = fileURLToPath(new URL('../skills', import.meta.url))
const WORKSPACE_CONFIG_FILE = 'pnpm-workspace.yaml'
const PACKAGE_MANIFEST_FILE = 'package.json'

const PACKAGE_MANIFEST_TOOL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    packageDir: {
      type: 'string',
      description: 'Relative package directory under the workspace root. Defaults to the workspace root package.'
    }
  }
} as const

const PACKAGE_MANIFEST_UPDATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    packageDir: {
      type: 'string',
      description: 'Relative package directory under the workspace root. Defaults to the workspace root package.'
    },
    name: {
      type: 'string',
      description: 'New package name.'
    },
    description: {
      type: 'string',
      description: 'New package description.'
    },
    dependencies: dependencyRecordSchema('Dependencies to add or update.'),
    devDependencies: dependencyRecordSchema('Dev dependencies to add or update.'),
    peerDependencies: dependencyRecordSchema('Peer dependencies to add or update.'),
    optionalDependencies: dependencyRecordSchema('Optional dependencies to add or update.'),
    removeDependencies: dependencyArraySchema('Dependencies to remove.'),
    removeDevDependencies: dependencyArraySchema('Dev dependencies to remove.'),
    removePeerDependencies: dependencyArraySchema('Peer dependencies to remove.'),
    removeOptionalDependencies: dependencyArraySchema('Optional dependencies to remove.')
  }
} as const

export function createNodejsSimpleMdpClient(
  options: NodejsSimpleClientOptions = {}
): MdpClient {
  const client = createMdpClient({
    serverUrl: options.serverUrl ?? DEFAULT_SERVER_URL,
    client: buildClientInfo(options.client, options.workspaceRoot),
    ...(options.transport ? { transport: options.transport } : {})
  })

  registerNodejsSimpleCapabilities(client, {
    ...(options.workspaceRoot ? { workspaceRoot: options.workspaceRoot } : {}),
    ...(options.skillsDir ? { skillsDir: options.skillsDir } : {})
  })

  return client
}

export async function bootNodejsSimpleMdpClient(
  options: NodejsSimpleClientOptions = {}
): Promise<MdpClient> {
  const client = createNodejsSimpleMdpClient(options)
  await client.connect()
  client.register()
  return client
}

export function registerNodejsSimpleCapabilities(
  client: SimpleClient,
  options: RegisterNodejsSimpleCapabilitiesOptions = {}
): SimpleClient {
  client.exposeTool(
    'nodejs.getRuntimeInfo',
    async () => getNodejsRuntimeInfo(options.workspaceRoot),
    {
      description: 'Read the current Node.js runtime, workspace root, and root package dependency summary.'
    }
  )

  client.exposeTool(
    'workspace.listSubpackages',
    async () => listWorkspaceSubpackages(options.workspaceRoot),
    {
      description: 'List subpackages discovered in the current workspace.'
    }
  )

  client.exposeTool(
    'workspace.readPackageManifest',
    async (args) => readWorkspacePackageManifest(options.workspaceRoot, args),
    {
      description: 'Read one package.json from the current workspace.',
      inputSchema: PACKAGE_MANIFEST_TOOL_SCHEMA
    }
  )

  client.exposeTool(
    'workspace.updatePackageManifest',
    async (args) => updateWorkspacePackageManifest(options.workspaceRoot, args),
    {
      description: 'Update package.json metadata and dependency sections for one workspace package.',
      inputSchema: PACKAGE_MANIFEST_UPDATE_SCHEMA
    }
  )

  const skillsDir = options.skillsDir ?? DEFAULT_SKILLS_DIR

  client.exposeSkill(
    'nodejs-simple/overview',
    createFileBackedSkillResolver(skillsDir, 'overview.md'),
    {
      description: 'Overview of the Node.js simple MDP client.',
      contentType: 'text/markdown'
    }
  )

  client.exposeSkill(
    'nodejs-simple/tools',
    createFileBackedSkillResolver(skillsDir, 'tools.md'),
    {
      description: 'Tool-by-tool usage details for the Node.js simple MDP client.',
      contentType: 'text/markdown'
    }
  )

  client.exposeSkill(
    'nodejs-simple/package-json',
    createFileBackedSkillResolver(skillsDir, 'package-json.md'),
    {
      description: 'Package.json editing workflow guidance for the Node.js simple MDP client.',
      contentType: 'text/markdown'
    }
  )

  return client
}

export async function getNodejsRuntimeInfo(
  workspaceRootHint?: string
): Promise<RuntimeInfo> {
  const workspaceRoot = await resolveWorkspaceRoot(workspaceRootHint ?? process.cwd())
  const manifest = await readPackageManifest(path.join(workspaceRoot, PACKAGE_MANIFEST_FILE))

  return {
    nodeVersion: process.version,
    versions: {
      node: process.versions.node,
      v8: process.versions.v8,
      uv: process.versions.uv,
      openssl: process.versions.openssl
    },
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
    workspaceRoot,
    rootPackage: {
      ...(manifest.name ? { name: manifest.name } : {}),
      ...(manifest.version ? { version: manifest.version } : {}),
      ...(manifest.description ? { description: manifest.description } : {}),
      ...(manifest.private !== undefined ? { private: manifest.private } : {}),
      ...(manifest.packageManager ? { packageManager: manifest.packageManager } : {})
    },
    dependencySummary: {
      dependencies: Object.keys(manifest.dependencies ?? {}).length,
      devDependencies: Object.keys(manifest.devDependencies ?? {}).length,
      peerDependencies: Object.keys(manifest.peerDependencies ?? {}).length,
      optionalDependencies: Object.keys(manifest.optionalDependencies ?? {}).length
    },
    dependencies: {
      dependencies: manifest.dependencies ?? {},
      devDependencies: manifest.devDependencies ?? {},
      peerDependencies: manifest.peerDependencies ?? {},
      optionalDependencies: manifest.optionalDependencies ?? {}
    }
  }
}

export async function listWorkspaceSubpackages(
  workspaceRootHint?: string
): Promise<WorkspacePackageSummary[]> {
  const workspaceRoot = await resolveWorkspaceRoot(workspaceRootHint ?? process.cwd())
  const packageDirs = await discoverWorkspacePackageDirectories(workspaceRoot)
  const packages: WorkspacePackageSummary[] = []

  for (const packageDir of packageDirs) {
    if (packageDir === workspaceRoot) {
      continue
    }

    const manifestPath = path.join(packageDir, PACKAGE_MANIFEST_FILE)
    const manifest = await readPackageManifest(manifestPath)
    packages.push({
      name: manifest.name ?? path.basename(packageDir),
      ...(manifest.version ? { version: manifest.version } : {}),
      ...(manifest.description ? { description: manifest.description } : {}),
      private: manifest.private ?? false,
      relativeDir: normalizeRelativePath(path.relative(workspaceRoot, packageDir)),
      manifestPath
    })
  }

  return packages.sort((left, right) => left.relativeDir.localeCompare(right.relativeDir))
}

export async function readWorkspacePackageManifest(
  workspaceRootHint?: string,
  args?: RpcArguments
): Promise<ReadPackageManifestResult> {
  const workspaceRoot = await resolveWorkspaceRoot(workspaceRootHint ?? process.cwd())
  const packageDir = resolveTargetPackageDirectory(workspaceRoot, readOptionalString(args, 'packageDir'))
  const manifestPath = path.join(packageDir, PACKAGE_MANIFEST_FILE)

  return {
    workspaceRoot,
    packageDir: normalizeRelativePath(path.relative(workspaceRoot, packageDir)),
    manifestPath,
    manifest: await readPackageManifest(manifestPath)
  }
}

export async function updateWorkspacePackageManifest(
  workspaceRootHint?: string,
  args?: RpcArguments
): Promise<UpdatePackageManifestResult> {
  const workspaceRoot = await resolveWorkspaceRoot(workspaceRootHint ?? process.cwd())
  const update = readPackageManifestUpdate(args)
  const packageDir = resolveTargetPackageDirectory(workspaceRoot, update.packageDir)
  const manifestPath = path.join(packageDir, PACKAGE_MANIFEST_FILE)
  const manifest = await readPackageManifest(manifestPath)

  const changes: UpdatePackageManifestResult['changes'] = {
    nameChanged: false,
    descriptionChanged: false,
    dependenciesAdded: [],
    dependenciesUpdated: [],
    dependenciesRemoved: [],
    devDependenciesAdded: [],
    devDependenciesUpdated: [],
    devDependenciesRemoved: [],
    peerDependenciesAdded: [],
    peerDependenciesUpdated: [],
    peerDependenciesRemoved: [],
    optionalDependenciesAdded: [],
    optionalDependenciesUpdated: [],
    optionalDependenciesRemoved: []
  }

  if (update.name !== undefined && update.name !== manifest.name) {
    manifest.name = update.name
    changes.nameChanged = true
  }

  if (update.description !== undefined && update.description !== manifest.description) {
    manifest.description = update.description
    changes.descriptionChanged = true
  }

  applyDependencyUpdates(
    manifest,
    'dependencies',
    update.dependencies,
    update.removeDependencies,
    changes.dependenciesAdded,
    changes.dependenciesUpdated,
    changes.dependenciesRemoved
  )
  applyDependencyUpdates(
    manifest,
    'devDependencies',
    update.devDependencies,
    update.removeDevDependencies,
    changes.devDependenciesAdded,
    changes.devDependenciesUpdated,
    changes.devDependenciesRemoved
  )
  applyDependencyUpdates(
    manifest,
    'peerDependencies',
    update.peerDependencies,
    update.removePeerDependencies,
    changes.peerDependenciesAdded,
    changes.peerDependenciesUpdated,
    changes.peerDependenciesRemoved
  )
  applyDependencyUpdates(
    manifest,
    'optionalDependencies',
    update.optionalDependencies,
    update.removeOptionalDependencies,
    changes.optionalDependenciesAdded,
    changes.optionalDependenciesUpdated,
    changes.optionalDependenciesRemoved
  )

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  return {
    workspaceRoot,
    packageDir: normalizeRelativePath(path.relative(workspaceRoot, packageDir)),
    manifestPath,
    manifest,
    changes
  }
}

export async function resolveWorkspaceRoot(startDirectory: string): Promise<string> {
  let currentDirectory = path.resolve(startDirectory)

  while (true) {
    if (await hasFile(path.join(currentDirectory, WORKSPACE_CONFIG_FILE))) {
      return currentDirectory
    }

    if (await hasFile(path.join(currentDirectory, PACKAGE_MANIFEST_FILE))) {
      return currentDirectory
    }

    const parentDirectory = path.dirname(currentDirectory)
    if (parentDirectory === currentDirectory) {
      return path.resolve(startDirectory)
    }

    currentDirectory = parentDirectory
  }
}

function buildClientInfo(
  override: Partial<ClientInfo> | undefined,
  workspaceRoot: string | undefined
): ClientInfo {
  const metadata = {
    workspaceRoot: path.resolve(workspaceRoot ?? process.cwd()),
    ...(override?.metadata ?? {})
  }

  return {
    id: override?.id ?? 'nodejs-simple-01',
    name: override?.name ?? 'Node.js Simple Client',
    description: override?.description ?? 'Simple Node.js workspace client for MDP',
    ...(override?.version ? { version: override.version } : {}),
    platform: override?.platform ?? 'nodejs',
    metadata
  }
}

function createFileBackedSkillResolver(skillsDir: string, fileName: string) {
  return async () => {
    return await readFile(path.join(skillsDir, fileName), 'utf8')
  }
}

async function discoverWorkspacePackageDirectories(workspaceRoot: string): Promise<string[]> {
  const workspacePatterns = await readWorkspacePatterns(workspaceRoot)
  const directories = new Set<string>()

  for (const pattern of workspacePatterns) {
    for (const directoryPath of await expandWorkspacePattern(workspaceRoot, pattern)) {
      directories.add(directoryPath)
    }
  }

  if (directories.size === 0) {
    for (const directoryPath of await recursivePackageScan(workspaceRoot)) {
      directories.add(directoryPath)
    }
  }

  return [...directories].sort((left, right) => left.localeCompare(right))
}

async function readWorkspacePatterns(workspaceRoot: string): Promise<string[]> {
  const configPath = path.join(workspaceRoot, WORKSPACE_CONFIG_FILE)

  if (!(await hasFile(configPath))) {
    return []
  }

  const content = await readFile(configPath, 'utf8')
  const patterns: string[] = []
  let inPackagesBlock = false

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line) {
      continue
    }

    if (line === 'packages:') {
      inPackagesBlock = true
      continue
    }

    if (!inPackagesBlock) {
      continue
    }

    if (!line.startsWith('- ')) {
      if (!rawLine.startsWith(' ') && !rawLine.startsWith('\t')) {
        break
      }
      continue
    }

    patterns.push(stripQuotes(line.slice(2).trim()))
  }

  return patterns
}

async function expandWorkspacePattern(
  workspaceRoot: string,
  pattern: string
): Promise<string[]> {
  const segments = pattern
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)

  return await expandWorkspaceSegments(workspaceRoot, segments)
}

async function expandWorkspaceSegments(
  directoryPath: string,
  segments: string[]
): Promise<string[]> {
  if (segments.length === 0) {
    return (await hasFile(path.join(directoryPath, PACKAGE_MANIFEST_FILE)))
      ? [directoryPath]
      : []
  }

  const segment = segments[0]
  const rest = segments.slice(1)

  if (!segment) {
    return []
  }

  if (segment === '*') {
    const entries = await safeReadDirectory(directoryPath)
    const results: string[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue
      }

      results.push(...await expandWorkspaceSegments(path.join(directoryPath, entry.name), rest))
    }

    return results
  }

  if (segment === '**') {
    const results = await expandWorkspaceSegments(directoryPath, rest)
    const entries = await safeReadDirectory(directoryPath)

    for (const entry of entries) {
      if (!entry.isDirectory() || shouldSkipDirectory(entry.name)) {
        continue
      }

      results.push(...await expandWorkspaceSegments(path.join(directoryPath, entry.name), segments))
    }

    return results
  }

  const nextDirectory = path.join(directoryPath, segment)
  return await expandWorkspaceSegments(nextDirectory, rest)
}

async function recursivePackageScan(workspaceRoot: string): Promise<string[]> {
  const directories: string[] = []

  async function visit(currentDirectory: string): Promise<void> {
    if (currentDirectory !== workspaceRoot &&
      await hasFile(path.join(currentDirectory, PACKAGE_MANIFEST_FILE))) {
      directories.push(currentDirectory)
      return
    }

    const entries = await safeReadDirectory(currentDirectory)

    for (const entry of entries) {
      if (!entry.isDirectory() || shouldSkipDirectory(entry.name)) {
        continue
      }

      await visit(path.join(currentDirectory, entry.name))
    }
  }

  await visit(workspaceRoot)
  return directories
}

function shouldSkipDirectory(name: string): boolean {
  return name === 'node_modules' || name === '.git' || name === 'dist' || name === 'coverage'
}

async function safeReadDirectory(directoryPath: string) {
  try {
    return await readdir(directoryPath, { withFileTypes: true })
  }
  catch {
    return []
  }
}

async function readPackageManifest(filePath: string): Promise<PackageManifest> {
  const content = await readFile(filePath, 'utf8')
  const parsed = JSON.parse(content) as unknown

  if (!isPlainObject(parsed)) {
    throw new Error(`Package manifest at ${filePath} must contain a JSON object`)
  }

  return parsed as PackageManifest
}

async function hasFile(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  }
  catch {
    return false
  }
}

function resolveTargetPackageDirectory(workspaceRoot: string, packageDir: string | undefined): string {
  const targetDirectory = path.resolve(workspaceRoot, packageDir ?? '.')
  const relativePath = path.relative(workspaceRoot, targetDirectory)

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Package directory must stay inside the workspace root: ${packageDir ?? '.'}`)
  }

  return targetDirectory
}

function normalizeRelativePath(value: string): string {
  return value === '' ? '.' : value.replace(/\\/g, '/')
}

function dependencyRecordSchema(description: string) {
  return {
    type: 'object',
    description,
    additionalProperties: {
      type: 'string'
    }
  }
}

function dependencyArraySchema(description: string) {
  return {
    type: 'array',
    description,
    items: {
      type: 'string'
    }
  }
}

function readPackageManifestUpdate(args: RpcArguments) {
  return {
    packageDir: readOptionalString(args, 'packageDir'),
    name: readOptionalString(args, 'name'),
    description: readOptionalString(args, 'description'),
    dependencies: readStringRecord(args, 'dependencies'),
    devDependencies: readStringRecord(args, 'devDependencies'),
    peerDependencies: readStringRecord(args, 'peerDependencies'),
    optionalDependencies: readStringRecord(args, 'optionalDependencies'),
    removeDependencies: readStringArray(args, 'removeDependencies'),
    removeDevDependencies: readStringArray(args, 'removeDevDependencies'),
    removePeerDependencies: readStringArray(args, 'removePeerDependencies'),
    removeOptionalDependencies: readStringArray(args, 'removeOptionalDependencies')
  }
}

function applyDependencyUpdates(
  manifest: PackageManifest,
  sectionName: DependencySectionName,
  additions: Record<string, string>,
  removals: string[],
  addedTarget: string[],
  updatedTarget: string[],
  removedTarget: string[]
): void {
  const section = { ...(manifest[sectionName] ?? {}) }

  for (const [dependencyName, version] of Object.entries(additions)) {
    if (!(dependencyName in section)) {
      addedTarget.push(dependencyName)
    }
    else if (section[dependencyName] !== version) {
      updatedTarget.push(dependencyName)
    }

    section[dependencyName] = version
  }

  for (const dependencyName of removals) {
    if (dependencyName in section) {
      removedTarget.push(dependencyName)
      delete section[dependencyName]
    }
  }

  if (Object.keys(section).length > 0) {
    manifest[sectionName] = sortStringRecord(section)
    return
  }

  delete manifest[sectionName]
}

function readOptionalString(args: RpcArguments, key: string): string | undefined {
  if (!args || typeof args[key] !== 'string') {
    return undefined
  }

  return args[key] as string
}

function readStringRecord(args: RpcArguments, key: string): Record<string, string> {
  if (!args) {
    return {}
  }

  const value = args[key]
  if (!isPlainObject(value)) {
    return {}
  }

  const result: Record<string, string> = {}

  for (const [entryKey, entryValue] of Object.entries(value)) {
    if (typeof entryValue === 'string') {
      result[entryKey] = entryValue
    }
  }

  return result
}

function readStringArray(args: RpcArguments, key: string): string[] {
  if (!args) {
    return []
  }

  const value = args[key]
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is string => typeof entry === 'string')
}

function sortStringRecord(input: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(input).sort(([left], [right]) => left.localeCompare(right))
  )
}

function stripQuotes(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }

  return value
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
