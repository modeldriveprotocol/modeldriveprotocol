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
} from '../defaults.js'

import type { CliOptions } from './types.js'

export function createDefaultCliOptions(): CliOptions {
  return {
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
}

export function defaultClusterId(discoverHost: string, discoverStartPort: number): string {
  return `${discoverHost}:${discoverStartPort}`
}

export function parseClusterMembersOptionValue(value: string): string[] {
  const members = value
    .split(',')
    .map((memberId) => memberId.trim())
    .filter((memberId) => memberId.length > 0)

  if (members.length === 0) {
    throw new Error('Option --cluster-members requires at least one server id')
  }

  return [...new Set(members)]
}

export function parseNonEmptyStringOptionValue(optionName: string, value: string): string {
  const normalized = value.trim()

  if (normalized.length === 0) {
    throw new Error(`Option ${optionName} requires a non-empty value`)
  }

  return normalized
}

export function parsePortOptionValue(option: string, value: string): number {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65_535) {
    throw new Error(`Option ${option} requires a valid port number`)
  }

  return parsed
}

export function parsePositiveIntegerOptionValue(option: string, value: string): number {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Option ${option} requires a positive integer`)
  }

  return parsed
}

export function requireOptionValue(argv: string[], index: number): string {
  const option = argv[index]
  const nextValue = argv[index + 1]

  if (!option || !nextValue || nextValue.startsWith('-')) {
    throw new Error(`Option ${option ?? 'unknown'} requires a value`)
  }

  return nextValue
}

export function isAllowedClusterMember(
  clusterMembers: string[] | undefined,
  serverId: string
): boolean {
  return clusterMembers?.includes(serverId) ?? true
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
