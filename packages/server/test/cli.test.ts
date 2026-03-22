import { describe, expect, it } from 'vitest'

import { renderHelpText } from '../src/cli-reference.js'
import { parseArgs, resolveCliOptions } from '../src/cli.js'
import { parseSetupArgs, renderSetupHelpText } from '../src/setup.js'

describe('server cli', () => {
  it('parses defaults for clustered auto mode', () => {
    expect(parseArgs([])).toEqual({
      helpRequested: false,
      portProvided: false,
      options: {
        host: '127.0.0.1',
        port: 47372,
        clusterMode: 'auto',
        clusterId: '127.0.0.1:47372',
        discoverHost: '127.0.0.1',
        discoverStartPort: 47372,
        discoverAttempts: 100,
        clusterHeartbeatIntervalMs: 1000,
        clusterLeaseDurationMs: 4000,
        clusterElectionTimeoutMinMs: 4500,
        clusterElectionTimeoutMaxMs: 7000,
        clusterDiscoveryIntervalMs: 2000
      }
    })
  })

  it('keeps the preferred hub port in parsed options when clustered port is omitted', () => {
    expect(parseArgs(['--cluster-mode', 'auto'])).toEqual({
      helpRequested: false,
      portProvided: false,
      options: {
        host: '127.0.0.1',
        port: 47372,
        clusterMode: 'auto',
        clusterId: '127.0.0.1:47372',
        discoverHost: '127.0.0.1',
        discoverStartPort: 47372,
        discoverAttempts: 100,
        clusterHeartbeatIntervalMs: 1000,
        clusterLeaseDurationMs: 4000,
        clusterElectionTimeoutMinMs: 4500,
        clusterElectionTimeoutMaxMs: 7000,
        clusterDiscoveryIntervalMs: 2000
      }
    })
  })

  it('keeps an explicitly provided port in clustered modes', () => {
    expect(parseArgs(['--cluster-mode', 'proxy-required', '--port', '47170'])).toEqual({
      helpRequested: false,
      portProvided: true,
      options: {
        host: '127.0.0.1',
        port: 47170,
        clusterMode: 'proxy-required',
        clusterId: '127.0.0.1:47372',
        discoverHost: '127.0.0.1',
        discoverStartPort: 47372,
        discoverAttempts: 100,
        clusterHeartbeatIntervalMs: 1000,
        clusterLeaseDurationMs: 4000,
        clusterElectionTimeoutMinMs: 4500,
        clusterElectionTimeoutMaxMs: 7000,
        clusterDiscoveryIntervalMs: 2000
      }
    })
  })

  it('parses static cluster membership hints', () => {
    expect(parseArgs([
      '--server-id',
      'node-a',
      '--cluster-members',
      'node-a,node-b,node-c,node-b'
    ])).toEqual({
      helpRequested: false,
      portProvided: false,
      options: {
        host: '127.0.0.1',
        port: 47372,
        clusterMode: 'auto',
        clusterId: '127.0.0.1:47372',
        clusterMembers: ['node-a', 'node-b', 'node-c'],
        discoverHost: '127.0.0.1',
        discoverStartPort: 47372,
        discoverAttempts: 100,
        clusterHeartbeatIntervalMs: 1000,
        clusterLeaseDurationMs: 4000,
        clusterElectionTimeoutMinMs: 4500,
        clusterElectionTimeoutMaxMs: 7000,
        clusterDiscoveryIntervalMs: 2000,
        serverId: 'node-a'
      }
    })
  })

  it('derives cluster id from discovery settings unless explicitly provided', () => {
    expect(parseArgs([
      '--discover-host',
      '10.0.0.10',
      '--discover-start-port',
      '49000'
    ]).options.clusterId).toBe('10.0.0.10:49000')

    expect(parseArgs([
      '--discover-host',
      '10.0.0.10',
      '--discover-start-port',
      '49000',
      '--cluster-id',
      'cluster-prod'
    ]).options.clusterId).toBe('cluster-prod')
  })

  it('parses cluster config paths without mutating base defaults', () => {
    expect(parseArgs([
      '--cluster-config',
      '/tmp/mdp-cluster.json'
    ])).toEqual({
      helpRequested: false,
      portProvided: false,
      clusterConfigPath: '/tmp/mdp-cluster.json',
      options: {
        host: '127.0.0.1',
        port: 47372,
        clusterMode: 'auto',
        clusterId: '127.0.0.1:47372',
        discoverHost: '127.0.0.1',
        discoverStartPort: 47372,
        discoverAttempts: 100,
        clusterHeartbeatIntervalMs: 1000,
        clusterLeaseDurationMs: 4000,
        clusterElectionTimeoutMinMs: 4500,
        clusterElectionTimeoutMaxMs: 7000,
        clusterDiscoveryIntervalMs: 2000
      }
    })
  })

  it('loads cluster config defaults while keeping explicit CLI overrides authoritative', async () => {
    await expect(resolveCliOptions([
      '--cluster-config',
      '/tmp/mdp-cluster.json',
      '--cluster-id',
      'cluster-cli',
      '--discover-attempts',
      '12'
    ], {
      readTextFile: async () => JSON.stringify({
        clusterId: 'cluster-manifest',
        clusterMembers: ['node-a', 'node-b'],
        discoverHost: '10.0.0.10',
        discoverStartPort: 49000,
        discoverAttempts: 7,
        upstreamUrl: 'ws://10.0.0.10:49000'
      }),
      hasExistingClusterPeer: async () => false
    })).resolves.toEqual({
      helpRequested: false,
      portProvided: false,
      clusterConfigPath: '/tmp/mdp-cluster.json',
      options: {
        host: '127.0.0.1',
        port: 47372,
        clusterMode: 'auto',
        clusterId: 'cluster-cli',
        clusterMembers: ['node-a', 'node-b'],
        upstreamUrl: 'ws://10.0.0.10:49000',
        discoverHost: '10.0.0.10',
        discoverStartPort: 49000,
        discoverAttempts: 12,
        clusterHeartbeatIntervalMs: 1000,
        clusterLeaseDurationMs: 4000,
        clusterElectionTimeoutMinMs: 4500,
        clusterElectionTimeoutMaxMs: 7000,
        clusterDiscoveryIntervalMs: 2000
      }
    })
  })

  it('rejects malformed cluster config files', async () => {
    await expect(resolveCliOptions([
      '--cluster-config',
      '/tmp/mdp-cluster.json'
    ], {
      readTextFile: async () => JSON.stringify({
        clusterMembers: ['node-a', 3]
      })
    })).rejects.toThrow(
      'Cluster config /tmp/mdp-cluster.json field "clusterMembers" must be an array of strings'
    )
  })

  it('marks help requests without mutating defaults', () => {
    expect(parseArgs(['--help'])).toEqual({
      helpRequested: true,
      portProvided: false,
      options: {
        host: '127.0.0.1',
        port: 47372,
        clusterMode: 'auto',
        clusterId: '127.0.0.1:47372',
        discoverHost: '127.0.0.1',
        discoverStartPort: 47372,
        discoverAttempts: 100,
        clusterHeartbeatIntervalMs: 1000,
        clusterLeaseDurationMs: 4000,
        clusterElectionTimeoutMinMs: 4500,
        clusterElectionTimeoutMaxMs: 7000,
        clusterDiscoveryIntervalMs: 2000
      }
    })
  })

  it('throws for unknown flags and missing option values', () => {
    expect(() => {
      parseArgs(['--unknown'])
    }).toThrow('Unknown option: --unknown')

    expect(() => {
      parseArgs(['--upstream-url'])
    }).toThrow('Option --upstream-url requires a value')

    expect(() => {
      parseArgs(['--cluster-members', ' , '])
    }).toThrow('Option --cluster-members requires at least one server id')

    expect(() => {
      parseArgs(['--cluster-config', '   '])
    }).toThrow('Option --cluster-config requires a non-empty value')

    expect(() => {
      parseArgs(['--cluster-id', '   '])
    }).toThrow('Option --cluster-id requires a non-empty value')

    expect(() => {
      parseArgs(['--server-id', '   '])
    }).toThrow('Option --server-id requires a non-empty value')
  })

  it('rejects invalid numeric option values and invalid cluster timing combinations', () => {
    expect(() => {
      parseArgs(['--port', 'abc'])
    }).toThrow('Option --port requires a valid port number')

    expect(() => {
      parseArgs(['--discover-start-port', '70000'])
    }).toThrow('Option --discover-start-port requires a valid port number')

    expect(() => {
      parseArgs(['--discover-attempts', '0'])
    }).toThrow('Option --discover-attempts requires a positive integer')

    expect(() => {
      parseArgs(['--cluster-heartbeat-interval-ms', '0'])
    }).toThrow('Option --cluster-heartbeat-interval-ms requires a positive integer')

    expect(() => {
      parseArgs([
        '--cluster-election-timeout-min-ms',
        '5000',
        '--cluster-election-timeout-max-ms',
        '3000'
      ])
    }).toThrow('Option --cluster-election-timeout-min-ms cannot be greater than --cluster-election-timeout-max-ms')

    expect(() => {
      parseArgs([
        '--cluster-heartbeat-interval-ms',
        '3000',
        '--cluster-lease-duration-ms',
        '2000'
      ])
    }).toThrow('Option --cluster-lease-duration-ms must be greater than --cluster-heartbeat-interval-ms')

    expect(() => {
      parseArgs([
        '--cluster-mode',
        'standalone',
        '--cluster-members',
        'node-a,node-b'
      ])
    }).toThrow('Option --cluster-members cannot be used with --cluster-mode standalone')
  })

  it('renders help text that documents clustered startup and election settings', () => {
    const help = renderHelpText()

    expect(help).toContain('Usage: modeldriveprotocol-server [options]')
    expect(help).toContain('modeldriveprotocol-server setup [options]')
    expect(help).toContain('Commands:')
    expect(help).toContain('Configure supported agent and IDE MCP hosts')
    expect(help).toContain('--cluster-mode <standalone|auto|proxy-required>')
    expect(help).toContain('--cluster-id <id>')
    expect(help).toContain('--cluster-config <path>')
    expect(help).toContain('--upstream-url <ws-url>')
    expect(help).toContain('--cluster-members <id,id,...>')
    expect(help).toContain('--discover-attempts <count>')
    expect(help).toContain('--cluster-heartbeat-interval-ms <ms>')
    expect(help).toContain('--cluster-lease-duration-ms <ms>')
    expect(help).toContain('--cluster-election-timeout-min-ms <ms>')
    expect(help).toContain('--cluster-election-timeout-max-ms <ms>')
    expect(help).toContain('--cluster-discovery-interval-ms <ms>')
    expect(help).toContain('--server-id <id>')
  })

  it('parses setup defaults and renders setup help', () => {
    expect(parseSetupArgs([])).toEqual({
      helpRequested: false,
      options: {
        scope: 'user',
        targets: ['claude', 'codex', 'cursor'],
        name: 'mdp',
        dryRun: false
      }
    })

    expect(renderSetupHelpText()).toContain('Usage: modeldriveprotocol-server setup [options]')
    expect(renderSetupHelpText()).toContain('--scope <scope>')
  })
})
