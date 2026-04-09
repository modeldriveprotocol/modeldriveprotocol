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
  stateStoreEnabled?: boolean
  stateStoreDir?: string
}

export interface CliParseResult {
  helpRequested: boolean
  portProvided: boolean
  options: CliOptions
  clusterConfigPath?: string
}

export interface CliResolveResult extends CliParseResult {
  providedOptionNames: Set<string>
}

export interface ClusterConfigFile {
  clusterId?: string
  clusterMembers?: string[]
  upstreamUrl?: string
  discoverHost?: string
  discoverStartPort?: number
  discoverAttempts?: number
}

export type ReadTextFile = (filePath: string) => Promise<string>
