#!/usr/bin/env node

import { readFile } from 'node:fs/promises'

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { renderHelpText } from './cli-reference.js'
import { MdpClusterManager, type ClusterManagerState } from './cluster-manager.js'
import {
  DEFAULT_CLUSTER_DISCOVERY_INTERVAL_MS,
  DEFAULT_CLUSTER_ELECTION_TIMEOUT_MAX_MS,
  DEFAULT_CLUSTER_ELECTION_TIMEOUT_MIN_MS,
  DEFAULT_CLUSTER_HEARTBEAT_INTERVAL_MS,
  DEFAULT_CLUSTER_LEASE_DURATION_MS,
  DEFAULT_CLUSTER_MODE,
  DEFAULT_DISCOVERY_ATTEMPTS,
  DEFAULT_DISCOVERY_HOST,
  DEFAULT_MDP_PORT,
  DEFAULT_SERVER_HOST
} from './defaults.js'
import { createMcpBridge } from './mcp-bridge.js'
import { MdpServerRuntime } from './mdp-server.js'
import { type MdpTransportServerOptions, MdpTransportServer } from './transport-server.js'
import { discoverMdpServers, probeMdpServer } from './upstream-discovery.js'
import { MdpUpstreamProxy } from './upstream-proxy.js'
import { parseSetupArgs, renderSetupHelpText, runSetupCommand } from './setup.js'

export type ClusterMode = 'standalone' | 'auto' | 'proxy-required'

export interface CliOptions {
  host: string
  port: number
  tlsKeyPath?: string
  tlsCertPath?: string
  tlsCaPath?: string
  clusterMode: ClusterMode
  clusterId: string
  clusterMembers?: string[]
  upstreamUrl?: string
  discoverHost: string
  discoverStartPort: number
  discoverAttempts: number
  clusterHeartbeatIntervalMs: number
  clusterLeaseDurationMs: number
  clusterElectionTimeoutMinMs: number
  clusterElectionTimeoutMaxMs: number
  clusterDiscoveryIntervalMs: number
  serverId?: string
}

export interface CliParseResult {
  helpRequested: boolean
  portProvided: boolean
  options: CliOptions
  clusterConfigPath?: string
}

interface CliIo {
  info(message: string): void
  error(message: string): void
}

interface CliResolveResult extends CliParseResult {
  providedOptionNames: Set<string>
}

interface ClusterConfigFile {
  clusterId?: string
  clusterMembers?: string[]
  upstreamUrl?: string
  discoverHost?: string
  discoverStartPort?: number
  discoverAttempts?: number
}

type ReadTextFile = (filePath: string) => Promise<string>

export async function runCli(
  argv: string[] = process.argv.slice(2),
  io: CliIo = {
    info: (message) => {
      console.log(message)
    },
    error: (message) => {
      console.error(message)
    }
  }
): Promise<void> {
  if (argv[0] === 'setup') {
    const parsedSetup = parseSetupArgs(argv.slice(1))

    if (parsedSetup.helpRequested) {
      io.info(renderSetupHelpText())
      return
    }

    await runSetupCommand(parsedSetup.options, io)
    return
  }

  const parsed = await resolveCliOptions(argv)

  if (parsed.helpRequested) {
    io.info(renderHelpText())
    return
  }

  const effectiveOptions = parsed.options
  const serverId = resolveServerId(effectiveOptions)

  let upstreamProxy: MdpUpstreamProxy | undefined
  let transportServer: MdpTransportServer
  let clusterManager: MdpClusterManager | undefined
  let reconcileProxyPromise = Promise.resolve()
  let activeLeader: ClusterManagerState | undefined

  const runtime = new MdpServerRuntime({
    onClientRegistered: ({ client }) => {
      void upstreamProxy?.syncClient(client)
    },
    onClientRemoved: ({ client }) => {
      void upstreamProxy?.removeClient(client.id)
    }
  })
  const mcpServer = createMcpBridge(runtime)
  const transport = new StdioServerTransport()

  const queueProxyReconcile = (state: ClusterManagerState): void => {
    reconcileProxyPromise = reconcileProxyPromise
      .catch(() => {})
      .then(async () => {
        const nextLeaderKey = state.role === 'leader'
          ? `${serverId}@${state.term}`
          : `${state.leaderId ?? 'none'}@${state.term}`
        const previousLeaderKey = activeLeader
          ? (
              activeLeader.role === 'leader'
                ? `${serverId}@${activeLeader.term}`
                : `${activeLeader.leaderId ?? 'none'}@${activeLeader.term}`
            )
          : undefined

        activeLeader = state

        if (state.role === 'leader' || !state.leaderUrl || !state.leaderId) {
          if (upstreamProxy) {
            await upstreamProxy.close()
            upstreamProxy = undefined
          }

          if (previousLeaderKey !== nextLeaderKey) {
            io.error(`MDP cluster primary is ${serverId} for term ${state.term}`)
          }
          return
        }

        if (
          upstreamProxy &&
          activeLeader?.leaderId === state.leaderId &&
          activeLeader?.leaderUrl === state.leaderUrl &&
          previousLeaderKey === nextLeaderKey
        ) {
          return
        }

        const nextProxy = new MdpUpstreamProxy({
          runtime,
          upstreamUrl: state.leaderUrl,
          serverId
        })

        await nextProxy.start()
        await Promise.allSettled(
          runtime.listClients().map((client) => nextProxy.syncClient(client))
        )

        const previousProxy = upstreamProxy
        upstreamProxy = nextProxy

        await previousProxy?.close()
        io.error(`MDP cluster following primary ${state.leaderId} at ${state.leaderUrl} for term ${state.term}`)
      })
  }

  if (effectiveOptions.clusterMode !== 'standalone') {
    clusterManager = new MdpClusterManager({
      serverId,
      clusterId: effectiveOptions.clusterId,
      clusterMode: effectiveOptions.clusterMode,
      ...(effectiveOptions.clusterMembers
        ? { clusterMembers: effectiveOptions.clusterMembers }
        : {}),
      discoverHost: effectiveOptions.discoverHost,
      discoverStartPort: effectiveOptions.discoverStartPort,
      discoverAttempts: effectiveOptions.discoverAttempts,
      seedUrls: effectiveOptions.upstreamUrl ? [effectiveOptions.upstreamUrl] : [],
      heartbeatIntervalMs: effectiveOptions.clusterHeartbeatIntervalMs,
      leaseDurationMs: effectiveOptions.clusterLeaseDurationMs,
      electionTimeoutMinMs: effectiveOptions.clusterElectionTimeoutMinMs,
      electionTimeoutMaxMs: effectiveOptions.clusterElectionTimeoutMaxMs,
      discoveryIntervalMs: effectiveOptions.clusterDiscoveryIntervalMs,
      getSelfEndpoints: () => ({
        ws: transportServer.endpoints.ws,
        cluster: transportServer.endpoints.cluster
      }),
      onStateChange: ({ state, roleChanged, leaderChanged }) => {
        if (roleChanged || leaderChanged) {
          queueProxyReconcile(state)
        }
      }
    })
  }

  transportServer = new MdpTransportServer(runtime, await toServerOptions(
    effectiveOptions,
    serverId,
    clusterManager
  ))

  try {
    await transportServer.start()
    await mcpServer.connect(transport)
    await clusterManager?.start()
    if (clusterManager) {
      queueProxyReconcile(clusterManager.state)
      await reconcileProxyPromise
    }
  } catch (error) {
    await Promise.allSettled([
      clusterManager?.close() ?? Promise.resolve(),
      mcpServer.close(),
      transportServer.stop()
    ])
    throw error
  }

  const endpoints = transportServer.endpoints
  io.error(`MDP server listening on ${endpoints.ws}`)
  io.error(`MDP HTTP loop endpoint listening on ${endpoints.httpLoop}`)
  io.error(`MDP auth endpoint listening on ${endpoints.auth}`)
  io.error(`MDP meta endpoint listening on ${endpoints.meta}`)
  io.error(`MDP cluster endpoint listening on ${endpoints.cluster}`)

  if (clusterManager) {
    const state = clusterManager.state
    if (state.role === 'leader') {
      io.error(`MDP cluster primary is ${serverId} for term ${state.term}`)
    } else if (state.leaderId && state.leaderUrl) {
      io.error(`MDP cluster following primary ${state.leaderId} at ${state.leaderUrl} for term ${state.term}`)
    } else {
      io.error('MDP cluster started without a settled primary yet')
    }
  } else {
    io.error('MDP server running without cluster control')
  }

  const shutdown = async () => {
    await Promise.allSettled([
      clusterManager?.close() ?? Promise.resolve(),
      upstreamProxy?.close() ?? Promise.resolve(),
      reconcileProxyPromise,
      mcpServer.close(),
      transportServer.stop()
    ])
    process.exit(0)
  }

  process.on('SIGINT', () => {
    void shutdown()
  })

  process.on('SIGTERM', () => {
    void shutdown()
  })
}

export function parseArgs(argv: string[]): CliParseResult {
  const {
    providedOptionNames: _providedOptionNames,
    ...parsed
  } = parseArgsDetailed(argv)

  return parsed
}

export async function resolveCliOptions(
  argv: string[],
  dependencies: {
    readTextFile?: ReadTextFile
    hasExistingClusterPeer?: (options: CliOptions) => Promise<boolean>
  } = {}
): Promise<CliParseResult> {
  const parsed = parseArgsDetailed(argv)
  const merged = await applyClusterConfig(parsed, dependencies.readTextFile ?? defaultReadTextFile)
  const finalizedOptions = await finalizeCliOptions(
    merged.options,
    merged.portProvided,
    dependencies.hasExistingClusterPeer ?? hasExistingClusterPeer
  )

  return {
    helpRequested: merged.helpRequested,
    portProvided: merged.portProvided,
    ...(merged.clusterConfigPath ? { clusterConfigPath: merged.clusterConfigPath } : {}),
    options: finalizedOptions
  }
}

function parseArgsDetailed(argv: string[]): CliResolveResult {
  const options: CliOptions = {
    host: DEFAULT_SERVER_HOST,
    port: DEFAULT_MDP_PORT,
    clusterMode: DEFAULT_CLUSTER_MODE,
    clusterId: defaultClusterId(DEFAULT_DISCOVERY_HOST, DEFAULT_MDP_PORT),
    discoverHost: DEFAULT_DISCOVERY_HOST,
    discoverStartPort: DEFAULT_MDP_PORT,
    discoverAttempts: DEFAULT_DISCOVERY_ATTEMPTS,
    clusterHeartbeatIntervalMs: DEFAULT_CLUSTER_HEARTBEAT_INTERVAL_MS,
    clusterLeaseDurationMs: DEFAULT_CLUSTER_LEASE_DURATION_MS,
    clusterElectionTimeoutMinMs: DEFAULT_CLUSTER_ELECTION_TIMEOUT_MIN_MS,
    clusterElectionTimeoutMaxMs: DEFAULT_CLUSTER_ELECTION_TIMEOUT_MAX_MS,
    clusterDiscoveryIntervalMs: DEFAULT_CLUSTER_DISCOVERY_INTERVAL_MS
  }
  let helpRequested = false
  let portProvided = false
  let clusterIdProvided = false
  let clusterConfigPath: string | undefined
  const providedOptionNames = new Set<string>()

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]

    if (value === '--help' || value === '-h') {
      helpRequested = true
      continue
    }

    if (!value) {
      continue
    }

    if (value === '--host') {
      const nextValue = requireOptionValue(argv, index)
      options.host = nextValue
      index += 1
      continue
    }

    if (value === '--port') {
      const nextValue = requireOptionValue(argv, index)
      options.port = parsePortOptionValue('--port', nextValue)
      portProvided = true
      providedOptionNames.add('port')
      index += 1
      continue
    }

    if (value === '--tls-key') {
      const nextValue = requireOptionValue(argv, index)
      options.tlsKeyPath = nextValue
      index += 1
      continue
    }

    if (value === '--tls-cert') {
      const nextValue = requireOptionValue(argv, index)
      options.tlsCertPath = nextValue
      index += 1
      continue
    }

    if (value === '--tls-ca') {
      const nextValue = requireOptionValue(argv, index)
      options.tlsCaPath = nextValue
      index += 1
      continue
    }

    if (value === '--cluster-mode') {
      const nextValue = requireOptionValue(argv, index)
      if (
        nextValue === 'standalone' ||
        nextValue === 'auto' ||
        nextValue === 'proxy-required'
      ) {
        options.clusterMode = nextValue
      } else {
        throw new Error(`Unsupported cluster mode: ${nextValue}`)
      }

      providedOptionNames.add('clusterMode')
      index += 1
      continue
    }

    if (value === '--cluster-id') {
      const nextValue = requireOptionValue(argv, index)
      options.clusterId = parseNonEmptyStringOptionValue('--cluster-id', nextValue)
      clusterIdProvided = true
      providedOptionNames.add('clusterId')
      index += 1
      continue
    }

    if (value === '--cluster-config') {
      const nextValue = requireOptionValue(argv, index)
      clusterConfigPath = parseNonEmptyStringOptionValue('--cluster-config', nextValue)
      index += 1
      continue
    }

    if (value === '--upstream-url') {
      const nextValue = requireOptionValue(argv, index)
      options.upstreamUrl = nextValue
      providedOptionNames.add('upstreamUrl')
      index += 1
      continue
    }

    if (value === '--cluster-members') {
      const nextValue = requireOptionValue(argv, index)
      options.clusterMembers = parseClusterMembersOptionValue(nextValue)
      providedOptionNames.add('clusterMembers')
      index += 1
      continue
    }

    if (value === '--discover-host') {
      const nextValue = requireOptionValue(argv, index)
      options.discoverHost = nextValue
      providedOptionNames.add('discoverHost')
      index += 1
      continue
    }

    if (value === '--discover-start-port') {
      const nextValue = requireOptionValue(argv, index)
      options.discoverStartPort = parsePortOptionValue('--discover-start-port', nextValue)
      providedOptionNames.add('discoverStartPort')
      index += 1
      continue
    }

    if (value === '--discover-attempts') {
      const nextValue = requireOptionValue(argv, index)
      options.discoverAttempts = parsePositiveIntegerOptionValue('--discover-attempts', nextValue)
      providedOptionNames.add('discoverAttempts')
      index += 1
      continue
    }

    if (value === '--cluster-heartbeat-interval-ms') {
      const nextValue = requireOptionValue(argv, index)
      options.clusterHeartbeatIntervalMs = parsePositiveIntegerOptionValue('--cluster-heartbeat-interval-ms', nextValue)
      index += 1
      continue
    }

    if (value === '--cluster-lease-duration-ms') {
      const nextValue = requireOptionValue(argv, index)
      options.clusterLeaseDurationMs = parsePositiveIntegerOptionValue('--cluster-lease-duration-ms', nextValue)
      index += 1
      continue
    }

    if (value === '--cluster-election-timeout-min-ms') {
      const nextValue = requireOptionValue(argv, index)
      options.clusterElectionTimeoutMinMs = parsePositiveIntegerOptionValue('--cluster-election-timeout-min-ms', nextValue)
      index += 1
      continue
    }

    if (value === '--cluster-election-timeout-max-ms') {
      const nextValue = requireOptionValue(argv, index)
      options.clusterElectionTimeoutMaxMs = parsePositiveIntegerOptionValue('--cluster-election-timeout-max-ms', nextValue)
      index += 1
      continue
    }

    if (value === '--cluster-discovery-interval-ms') {
      const nextValue = requireOptionValue(argv, index)
      options.clusterDiscoveryIntervalMs = parsePositiveIntegerOptionValue('--cluster-discovery-interval-ms', nextValue)
      index += 1
      continue
    }

    if (value === '--server-id') {
      const nextValue = requireOptionValue(argv, index)
      options.serverId = parseNonEmptyStringOptionValue('--server-id', nextValue)
      index += 1
      continue
    }

    if (value.startsWith('-')) {
      throw new Error(`Unknown option: ${value}`)
    }

    throw new Error(`Unexpected argument: ${value}`)
  }

  if (options.clusterElectionTimeoutMinMs > options.clusterElectionTimeoutMaxMs) {
    throw new Error('Option --cluster-election-timeout-min-ms cannot be greater than --cluster-election-timeout-max-ms')
  }

  if (options.clusterLeaseDurationMs <= options.clusterHeartbeatIntervalMs) {
    throw new Error('Option --cluster-lease-duration-ms must be greater than --cluster-heartbeat-interval-ms')
  }

  if (!clusterIdProvided) {
    options.clusterId = defaultClusterId(options.discoverHost, options.discoverStartPort)
  }

  if (options.clusterMode === 'standalone' && options.clusterMembers) {
    throw new Error('Option --cluster-members cannot be used with --cluster-mode standalone')
  }

  return {
    helpRequested,
    portProvided,
    ...(clusterConfigPath ? { clusterConfigPath } : {}),
    options,
    providedOptionNames
  }
}

async function toServerOptions(
  options: CliOptions,
  serverId: string,
  clusterManager: MdpClusterManager | undefined
): Promise<MdpTransportServerOptions> {
  return {
    host: options.host,
    port: options.port,
    serverId,
    clusterId: options.clusterId,
    ...(clusterManager
      ? {
          clusterMetaProvider: () => clusterManager.state,
          onClusterConnection: (socket) => {
            clusterManager.handleConnection(socket)
          }
        }
      : {}),
    ...(await loadTlsOptions(options))
  }
}

async function finalizeCliOptions(
  options: CliOptions,
  portProvided: boolean,
  detectExistingClusterPeer: (options: CliOptions) => Promise<boolean>
): Promise<CliOptions> {
  if (portProvided || options.clusterMode === 'standalone') {
    return options
  }

  if (await detectExistingClusterPeer(options)) {
    return {
      ...options,
      port: 0
    }
  }

  return options
}

async function hasExistingClusterPeer(options: CliOptions): Promise<boolean> {
  if (options.upstreamUrl) {
    const server = await probeMdpServer(options.upstreamUrl, {
      requiredClusterId: options.clusterId
    })
    if (!server) {
      return false
    }

    return isAllowedClusterMember(options.clusterMembers, server.meta.serverId)
  }

  const discovered = await discoverMdpServers({
    requiredClusterId: options.clusterId,
    host: options.discoverHost,
    startPort: options.discoverStartPort,
    attempts: options.discoverAttempts
  })

  return discovered.some((server) => isAllowedClusterMember(options.clusterMembers, server.meta.serverId))
}

async function applyClusterConfig(
  parsed: CliResolveResult,
  readTextFile: ReadTextFile
): Promise<CliResolveResult> {
  if (!parsed.clusterConfigPath) {
    return parsed
  }

  const clusterConfig = await loadClusterConfig(parsed.clusterConfigPath, readTextFile)
  const options: CliOptions = {
    ...parsed.options
  }

  if (!parsed.providedOptionNames.has('clusterId') && clusterConfig.clusterId) {
    options.clusterId = clusterConfig.clusterId
  }

  if (!parsed.providedOptionNames.has('clusterMembers') && clusterConfig.clusterMembers) {
    options.clusterMembers = clusterConfig.clusterMembers
  }

  if (!parsed.providedOptionNames.has('upstreamUrl') && clusterConfig.upstreamUrl) {
    options.upstreamUrl = clusterConfig.upstreamUrl
  }

  if (!parsed.providedOptionNames.has('discoverHost') && clusterConfig.discoverHost) {
    options.discoverHost = clusterConfig.discoverHost
  }

  if (!parsed.providedOptionNames.has('discoverStartPort') && clusterConfig.discoverStartPort !== undefined) {
    options.discoverStartPort = clusterConfig.discoverStartPort
  }

  if (!parsed.providedOptionNames.has('discoverAttempts') && clusterConfig.discoverAttempts !== undefined) {
    options.discoverAttempts = clusterConfig.discoverAttempts
  }

  if (!parsed.providedOptionNames.has('clusterId') && !clusterConfig.clusterId) {
    options.clusterId = defaultClusterId(options.discoverHost, options.discoverStartPort)
  }

  if (options.clusterMode === 'standalone' && options.clusterMembers) {
    throw new Error('Option --cluster-members cannot be used with --cluster-mode standalone')
  }

  return {
    ...parsed,
    options
  }
}

async function loadClusterConfig(
  filePath: string,
  readTextFile: ReadTextFile
): Promise<ClusterConfigFile> {
  let payload: unknown

  try {
    payload = JSON.parse(await readTextFile(filePath))
  } catch (error) {
    throw new Error(
      `Unable to load cluster config ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  if (!isRecord(payload)) {
    throw new Error(`Cluster config ${filePath} must be a JSON object`)
  }

  const clusterConfig: ClusterConfigFile = {}

  if ('clusterId' in payload) {
    if (typeof payload.clusterId !== 'string') {
      throw new Error(`Cluster config ${filePath} field "clusterId" must be a string`)
    }
    clusterConfig.clusterId = parseNonEmptyStringOptionValue('cluster config field "clusterId"', payload.clusterId)
  }

  if ('clusterMembers' in payload) {
    if (!Array.isArray(payload.clusterMembers) || payload.clusterMembers.some((item) => typeof item !== 'string')) {
      throw new Error(`Cluster config ${filePath} field "clusterMembers" must be an array of strings`)
    }
    clusterConfig.clusterMembers = parseClusterMembersOptionValue(payload.clusterMembers.join(','))
  }

  if ('upstreamUrl' in payload) {
    if (typeof payload.upstreamUrl !== 'string') {
      throw new Error(`Cluster config ${filePath} field "upstreamUrl" must be a string`)
    }
    clusterConfig.upstreamUrl = parseNonEmptyStringOptionValue('cluster config field "upstreamUrl"', payload.upstreamUrl)
  }

  if ('discoverHost' in payload) {
    if (typeof payload.discoverHost !== 'string') {
      throw new Error(`Cluster config ${filePath} field "discoverHost" must be a string`)
    }
    clusterConfig.discoverHost = parseNonEmptyStringOptionValue('cluster config field "discoverHost"', payload.discoverHost)
  }

  if ('discoverStartPort' in payload) {
    if (typeof payload.discoverStartPort !== 'number') {
      throw new Error(`Cluster config ${filePath} field "discoverStartPort" must be a number`)
    }
    clusterConfig.discoverStartPort = parsePortOptionValue(
      'cluster config field "discoverStartPort"',
      String(payload.discoverStartPort)
    )
  }

  if ('discoverAttempts' in payload) {
    if (typeof payload.discoverAttempts !== 'number') {
      throw new Error(`Cluster config ${filePath} field "discoverAttempts" must be a number`)
    }
    clusterConfig.discoverAttempts = parsePositiveIntegerOptionValue(
      'cluster config field "discoverAttempts"',
      String(payload.discoverAttempts)
    )
  }

  return clusterConfig
}

function defaultClusterId(discoverHost: string, discoverStartPort: number): string {
  return `${discoverHost}:${discoverStartPort}`
}

async function defaultReadTextFile(filePath: string): Promise<string> {
  return await readFile(filePath, 'utf8')
}

function parseClusterMembersOptionValue(value: string): string[] {
  const members = value
    .split(',')
    .map((memberId) => memberId.trim())
    .filter((memberId) => memberId.length > 0)

  if (members.length === 0) {
    throw new Error('Option --cluster-members requires at least one server id')
  }

  return [...new Set(members)]
}

function isAllowedClusterMember(
  clusterMembers: string[] | undefined,
  serverId: string
): boolean {
  return clusterMembers?.includes(serverId) ?? true
}

function parseNonEmptyStringOptionValue(optionName: string, value: string): string {
  const normalized = value.trim()

  if (normalized.length === 0) {
    throw new Error(`Option ${optionName} requires a non-empty value`)
  }

  return normalized
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function resolveServerId(options: CliOptions): string {
  if (options.serverId) {
    return options.serverId
  }

  if (options.port !== 0) {
    return `${options.host}:${options.port}`
  }

  return `mdp-server-${process.pid}`
}

async function loadTlsOptions(
  options: CliOptions
): Promise<Pick<MdpTransportServerOptions, 'tls'> | Record<string, never>> {
  if (!options.tlsKeyPath && !options.tlsCertPath && !options.tlsCaPath) {
    return {}
  }

  if (!options.tlsKeyPath || !options.tlsCertPath) {
    throw new Error('Both --tls-key and --tls-cert are required to enable TLS')
  }

  const [key, cert, ca] = await Promise.all([
    readFile(options.tlsKeyPath),
    readFile(options.tlsCertPath),
    options.tlsCaPath ? readFile(options.tlsCaPath) : Promise.resolve(undefined)
  ])

  return {
    tls: {
      key,
      cert,
      ...(ca ? { ca } : {})
    }
  }
}

function requireOptionValue(argv: string[], index: number): string {
  const option = argv[index]
  const nextValue = argv[index + 1]

  if (!option || !nextValue || nextValue.startsWith('-')) {
    throw new Error(`Option ${option ?? 'unknown'} requires a value`)
  }

  return nextValue
}

function parsePortOptionValue(option: string, value: string): number {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65_535) {
    throw new Error(`Option ${option} requires a valid port number`)
  }

  return parsed
}

function parsePositiveIntegerOptionValue(option: string, value: string): number {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Option ${option} requires a positive integer`)
  }

  return parsed
}

const isDirectExecution = (() => {
  try {
    return import.meta.url === new URL(process.argv[1]!, 'file:').href
  } catch {
    return false
  }
})()

if (isDirectExecution) {
  void runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
