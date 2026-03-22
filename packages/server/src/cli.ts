#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { renderHelpText } from './cli-reference.js'
import {
  DEFAULT_CLUSTER_MODE,
  DEFAULT_DISCOVERY_ATTEMPTS,
  DEFAULT_DISCOVERY_HOST,
  DEFAULT_MDP_PORT,
  DEFAULT_SERVER_HOST
} from './defaults.js'
import { createMcpBridge } from './mcp-bridge.js'
import { MdpServerRuntime } from './mdp-server.js'
import { type MdpTransportServerOptions, MdpTransportServer } from './transport-server.js'
import {
  discoverUpstreamMdpServer,
  type DiscoveredMdpServer,
  probeMdpServer
} from './upstream-discovery.js'
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
  upstreamUrl?: string
  discoverHost: string
  discoverStartPort: number
  discoverAttempts: number
  serverId?: string
}

export interface CliParseResult {
  helpRequested: boolean
  portProvided: boolean
  options: CliOptions
}

interface CliIo {
  info(message: string): void
  error(message: string): void
}

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

  const parsed = parseArgs(argv)

  if (parsed.helpRequested) {
    io.info(renderHelpText())
    return
  }

  const options = parsed.options
  const upstream = await resolveUpstream(options)
  const effectiveOptions = finalizeCliOptions(options, parsed.portProvided, upstream)
  let upstreamProxy: MdpUpstreamProxy | undefined
  const runtime = new MdpServerRuntime({
    onClientRegistered: ({ client }) => {
      void upstreamProxy?.syncClient(client)
    },
    onClientRemoved: ({ client }) => {
      void upstreamProxy?.removeClient(client.id)
    }
  })
  const transportServer = new MdpTransportServer(runtime, await toServerOptions(effectiveOptions))
  const mcpServer = createMcpBridge(runtime)
  const transport = new StdioServerTransport()
  const serverId = resolveServerId(effectiveOptions, parsed.portProvided, upstream)

  if (upstream) {
    upstreamProxy = new MdpUpstreamProxy({
      runtime,
      upstreamUrl: upstream.url,
      serverId,
      onUpstreamUnavailable: ({ upstreamUrl, error }) => {
        io.error(
          `MDP upstream proxy lost connection to ${upstreamUrl}: ${error.message}`
        )
        io.error(
          'MDP upstream proxy promoted this server to primary mode'
        )
        upstreamProxy = undefined
      }
    })

    try {
      await upstreamProxy.start()
    } catch (error) {
      if (options.clusterMode === 'proxy-required') {
        throw error
      }

      io.error(
        `MDP upstream proxy could not establish a control connection: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      io.error('MDP upstream proxy promoted this server to primary mode')
      upstreamProxy = undefined
    }
  }

  await transportServer.start()
  await mcpServer.connect(transport)

  const endpoints = transportServer.endpoints
  io.error(`MDP server listening on ${endpoints.ws}`)
  io.error(`MDP HTTP loop endpoint listening on ${endpoints.httpLoop}`)
  io.error(`MDP auth endpoint listening on ${endpoints.auth}`)
  io.error(`MDP meta endpoint listening on ${endpoints.meta}`)

  if (upstream) {
    io.error(`MDP upstream proxy connected to ${upstream.meta.serverId} at ${upstream.url}`)
  } else {
    io.error('MDP server running without upstream proxy')
  }

  const shutdown = async () => {
    await Promise.allSettled([
      mcpServer.close(),
      upstreamProxy?.close() ?? Promise.resolve(),
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
  const options: CliOptions = {
    host: DEFAULT_SERVER_HOST,
    port: DEFAULT_MDP_PORT,
    clusterMode: DEFAULT_CLUSTER_MODE,
    discoverHost: DEFAULT_DISCOVERY_HOST,
    discoverStartPort: DEFAULT_MDP_PORT,
    discoverAttempts: DEFAULT_DISCOVERY_ATTEMPTS
  }
  let helpRequested = false
  let portProvided = false

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

      index += 1
      continue
    }

    if (value === '--upstream-url') {
      const nextValue = requireOptionValue(argv, index)
      options.upstreamUrl = nextValue
      index += 1
      continue
    }

    if (value === '--discover-host') {
      const nextValue = requireOptionValue(argv, index)
      options.discoverHost = nextValue
      index += 1
      continue
    }

    if (value === '--discover-start-port') {
      const nextValue = requireOptionValue(argv, index)
      options.discoverStartPort = parsePortOptionValue('--discover-start-port', nextValue)
      index += 1
      continue
    }

    if (value === '--discover-attempts') {
      const nextValue = requireOptionValue(argv, index)
      options.discoverAttempts = parsePositiveIntegerOptionValue('--discover-attempts', nextValue)
      index += 1
      continue
    }

    if (value === '--server-id') {
      const nextValue = requireOptionValue(argv, index)
      options.serverId = nextValue
      index += 1
      continue
    }

    if (value.startsWith('-')) {
      throw new Error(`Unknown option: ${value}`)
    }

    throw new Error(`Unexpected argument: ${value}`)
  }

  return {
    helpRequested,
    portProvided,
    options
  }
}

async function toServerOptions(
  options: CliOptions
): Promise<MdpTransportServerOptions> {
  return {
    host: options.host,
    port: options.port,
    ...(options.serverId ? { serverId: options.serverId } : {}),
    ...(await loadTlsOptions(options))
  }
}

async function resolveUpstream(
  options: CliOptions
): Promise<DiscoveredMdpServer | undefined> {
  if (options.clusterMode === 'standalone') {
    return undefined
  }

  if (options.upstreamUrl) {
    const discovered = await probeMdpServer(options.upstreamUrl)

    if (!discovered) {
      throw new Error(`Unable to probe upstream MDP server at ${options.upstreamUrl}`)
    }

    return discovered
  }

  const discovered = await discoverUpstreamMdpServer({
    host: options.discoverHost,
    startPort: options.discoverStartPort,
    attempts: options.discoverAttempts
  })

  if (!discovered && options.clusterMode === 'proxy-required') {
    throw new Error(
      `Unable to discover an upstream MDP server from ${options.discoverHost}:${options.discoverStartPort} within ${options.discoverAttempts} ports`
    )
  }

  return discovered
}

function finalizeCliOptions(
  options: CliOptions,
  portProvided: boolean,
  upstream: DiscoveredMdpServer | undefined
): CliOptions {
  if (portProvided || !upstream) {
    return options
  }

  return {
    ...options,
    port: 0
  }
}

function resolveServerId(
  options: CliOptions,
  portProvided: boolean,
  upstream: DiscoveredMdpServer | undefined
): string {
  if (options.serverId) {
    return options.serverId
  }

  if (!portProvided && upstream) {
    return `mdp-edge-${process.pid}`
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

const isCliEntrypoint = process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1]

if (isCliEntrypoint) {
  void runCli().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
