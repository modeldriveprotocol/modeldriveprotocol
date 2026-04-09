import {
  createDefaultCliOptions,
  defaultClusterId,
  parseClusterMembersOptionValue,
  parseNonEmptyStringOptionValue,
  parsePortOptionValue,
  parsePositiveIntegerOptionValue,
  requireOptionValue
} from './shared.js'
import type { CliParseResult, CliResolveResult } from './types.js'

export function parseArgs(argv: string[]): CliParseResult {
  const {
    providedOptionNames: _providedOptionNames,
    ...parsed
  } = parseArgsDetailed(argv)

  return parsed
}

export function parseArgsDetailed(argv: string[]): CliResolveResult {
  const options = createDefaultCliOptions()
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
      options.host = requireOptionValue(argv, index)
      index += 1
      continue
    }

    if (value === '--port') {
      options.port = parsePortOptionValue('--port', requireOptionValue(argv, index))
      portProvided = true
      providedOptionNames.add('port')
      index += 1
      continue
    }

    if (value === '--tls-key') {
      options.tlsKeyPath = requireOptionValue(argv, index)
      index += 1
      continue
    }

    if (value === '--tls-cert') {
      options.tlsCertPath = requireOptionValue(argv, index)
      index += 1
      continue
    }

    if (value === '--tls-ca') {
      options.tlsCaPath = requireOptionValue(argv, index)
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
      options.clusterId = parseNonEmptyStringOptionValue(
        '--cluster-id',
        requireOptionValue(argv, index)
      )
      clusterIdProvided = true
      providedOptionNames.add('clusterId')
      index += 1
      continue
    }

    if (value === '--cluster-config') {
      clusterConfigPath = parseNonEmptyStringOptionValue(
        '--cluster-config',
        requireOptionValue(argv, index)
      )
      index += 1
      continue
    }

    if (value === '--upstream-url') {
      options.upstreamUrl = requireOptionValue(argv, index)
      providedOptionNames.add('upstreamUrl')
      index += 1
      continue
    }

    if (value === '--cluster-members') {
      options.clusterMembers = parseClusterMembersOptionValue(requireOptionValue(argv, index))
      providedOptionNames.add('clusterMembers')
      index += 1
      continue
    }

    if (value === '--discover-host') {
      options.discoverHost = requireOptionValue(argv, index)
      providedOptionNames.add('discoverHost')
      index += 1
      continue
    }

    if (value === '--discover-start-port') {
      options.discoverStartPort = parsePortOptionValue(
        '--discover-start-port',
        requireOptionValue(argv, index)
      )
      providedOptionNames.add('discoverStartPort')
      index += 1
      continue
    }

    if (value === '--discover-attempts') {
      options.discoverAttempts = parsePositiveIntegerOptionValue(
        '--discover-attempts',
        requireOptionValue(argv, index)
      )
      providedOptionNames.add('discoverAttempts')
      index += 1
      continue
    }

    if (value === '--cluster-heartbeat-interval-ms') {
      options.clusterHeartbeatIntervalMs = parsePositiveIntegerOptionValue(
        '--cluster-heartbeat-interval-ms',
        requireOptionValue(argv, index)
      )
      index += 1
      continue
    }

    if (value === '--cluster-lease-duration-ms') {
      options.clusterLeaseDurationMs = parsePositiveIntegerOptionValue(
        '--cluster-lease-duration-ms',
        requireOptionValue(argv, index)
      )
      index += 1
      continue
    }

    if (value === '--cluster-election-timeout-min-ms') {
      options.clusterElectionTimeoutMinMs = parsePositiveIntegerOptionValue(
        '--cluster-election-timeout-min-ms',
        requireOptionValue(argv, index)
      )
      index += 1
      continue
    }

    if (value === '--cluster-election-timeout-max-ms') {
      options.clusterElectionTimeoutMaxMs = parsePositiveIntegerOptionValue(
        '--cluster-election-timeout-max-ms',
        requireOptionValue(argv, index)
      )
      index += 1
      continue
    }

    if (value === '--cluster-discovery-interval-ms') {
      options.clusterDiscoveryIntervalMs = parsePositiveIntegerOptionValue(
        '--cluster-discovery-interval-ms',
        requireOptionValue(argv, index)
      )
      index += 1
      continue
    }

    if (value === '--server-id') {
      options.serverId = parseNonEmptyStringOptionValue(
        '--server-id',
        requireOptionValue(argv, index)
      )
      index += 1
      continue
    }

    if (value === '--state-store') {
      options.stateStoreEnabled = true
      continue
    }

    if (value === '--state-store-dir') {
      options.stateStoreEnabled = true
      options.stateStoreDir = parseNonEmptyStringOptionValue(
        '--state-store-dir',
        requireOptionValue(argv, index)
      )
      index += 1
      continue
    }

    if (value.startsWith('-')) {
      throw new Error(`Unknown option: ${value}`)
    }

    throw new Error(`Unexpected argument: ${value}`)
  }

  if (options.clusterElectionTimeoutMinMs > options.clusterElectionTimeoutMaxMs) {
    throw new Error(
      'Option --cluster-election-timeout-min-ms cannot be greater than --cluster-election-timeout-max-ms'
    )
  }

  if (options.clusterLeaseDurationMs <= options.clusterHeartbeatIntervalMs) {
    throw new Error(
      'Option --cluster-lease-duration-ms must be greater than --cluster-heartbeat-interval-ms'
    )
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
