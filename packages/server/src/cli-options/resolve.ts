import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { MdpClusterManager } from '../cluster-manager.js'
import type { MdpTransportServerOptions } from '../transport-server.js'
import { discoverMdpServers, probeMdpServer } from '../upstream-discovery.js'

import { parseArgsDetailed } from './parse.js'
import {
  defaultClusterId,
  isAllowedClusterMember,
  isRecord,
  parseClusterMembersOptionValue,
  parseNonEmptyStringOptionValue,
  parsePortOptionValue,
  parsePositiveIntegerOptionValue
} from './shared.js'
import type { CliOptions, CliParseResult, CliResolveResult, ClusterConfigFile, ReadTextFile } from './types.js'

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

export function resolveStateStoreDir(
  options: Pick<CliOptions, 'stateStoreEnabled' | 'stateStoreDir'>,
  startupCwd = process.cwd()
): string | undefined {
  const configuredDir = options.stateStoreDir?.trim()

  if (!options.stateStoreEnabled && !configuredDir) {
    return undefined
  }

  return path.resolve(startupCwd, configuredDir ?? path.join('.mdp', 'store'))
}

export function resolveServerId(options: CliOptions): string {
  if (options.serverId) {
    return options.serverId
  }

  if (options.port !== 0) {
    return `${options.host}:${options.port}`
  }

  return `mdp-server-${process.pid}`
}

export async function toServerOptions(
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

  if (
    !parsed.providedOptionNames.has('discoverStartPort') &&
    clusterConfig.discoverStartPort !== undefined
  ) {
    options.discoverStartPort = clusterConfig.discoverStartPort
  }

  if (
    !parsed.providedOptionNames.has('discoverAttempts') &&
    clusterConfig.discoverAttempts !== undefined
  ) {
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
    clusterConfig.clusterId = parseNonEmptyStringOptionValue(
      'cluster config field "clusterId"',
      payload.clusterId
    )
  }

  if ('clusterMembers' in payload) {
    if (
      !Array.isArray(payload.clusterMembers) ||
      payload.clusterMembers.some((item) => typeof item !== 'string')
    ) {
      throw new Error(
        `Cluster config ${filePath} field "clusterMembers" must be an array of strings`
      )
    }
    clusterConfig.clusterMembers = parseClusterMembersOptionValue(payload.clusterMembers.join(','))
  }

  if ('upstreamUrl' in payload) {
    if (typeof payload.upstreamUrl !== 'string') {
      throw new Error(`Cluster config ${filePath} field "upstreamUrl" must be a string`)
    }
    clusterConfig.upstreamUrl = parseNonEmptyStringOptionValue(
      'cluster config field "upstreamUrl"',
      payload.upstreamUrl
    )
  }

  if ('discoverHost' in payload) {
    if (typeof payload.discoverHost !== 'string') {
      throw new Error(`Cluster config ${filePath} field "discoverHost" must be a string`)
    }
    clusterConfig.discoverHost = parseNonEmptyStringOptionValue(
      'cluster config field "discoverHost"',
      payload.discoverHost
    )
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

async function defaultReadTextFile(filePath: string): Promise<string> {
  return await readFile(filePath, 'utf8')
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
