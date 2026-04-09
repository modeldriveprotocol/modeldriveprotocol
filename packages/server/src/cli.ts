#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { type BridgeRequest, executeBridgeRequest } from './bridge-requests.js'
import { resolveCliOptions, resolveServerId, resolveStateStoreDir, toServerOptions } from './cli-options.js'
import { renderHelpText } from './cli-reference.js'
import { type ClusterManagerState, MdpClusterManager } from './cluster-manager.js'
import { createMcpBridge } from './mcp-bridge.js'
import { MdpServerRuntime } from './mdp-server.js'
import { parseSetupArgs, renderSetupHelpText, runSetupCommand } from './setup.js'
import { MdpFilesystemStateStore } from './state-store.js'
import { MdpTransportServer } from './transport-server.js'
import { MdpUpstreamProxy } from './upstream-proxy.js'

export { parseArgs, resolveCliOptions, resolveStateStoreDir } from './cli-options.js'
export type { CliOptions, CliParseResult, ClusterMode } from './cli-options.js'

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

  const parsed = await resolveCliOptions(argv)

  if (parsed.helpRequested) {
    io.info(renderHelpText())
    return
  }

  const effectiveOptions = parsed.options
  const serverId = resolveServerId(effectiveOptions)
  const stateStoreDir = resolveStateStoreDir(effectiveOptions)
  let runtime: MdpServerRuntime
  const stateStore = stateStoreDir
    ? new MdpFilesystemStateStore({
      directory: stateStoreDir,
      serverId,
      clusterId: effectiveOptions.clusterId,
      clusterMode: effectiveOptions.clusterMode,
      startupCwd: process.cwd(),
      getClients: () => runtime.listClients(),
      getRoutes: () =>
        runtime.capabilityIndex.listPaths({
          depth: Number.MAX_SAFE_INTEGER
        })
    })
    : undefined

  let upstreamProxy: MdpUpstreamProxy | undefined
  let transportServer: MdpTransportServer
  let clusterManager: MdpClusterManager | undefined
  let reconcileProxyPromise = Promise.resolve()
  let activeLeader: ClusterManagerState | undefined
  const queueStateStoreUpdate = (operation: Promise<void> | undefined): void => {
    if (!operation) {
      return
    }

    void operation.catch((error) => {
      io.error(
        `MDP state store update failed: ${error instanceof Error ? error.message : String(error)}`
      )
    })
  }

  runtime = new MdpServerRuntime({
    onClientRegistered: ({ client }) => {
      queueStateStoreUpdate(stateStore?.syncRegistry())
      void upstreamProxy?.syncClient(client)
    },
    onClientRemoved: ({ client }) => {
      queueStateStoreUpdate(stateStore?.syncRegistry())
      void upstreamProxy?.removeClient(client.id)
    },
    onClientStateChanged: () => {
      queueStateStoreUpdate(stateStore?.syncRegistry())
    }
  })

  if (stateStore) {
    await stateStore.start()
  }

  const transport = new StdioServerTransport()
  const handleBridgeRequest = async (request: BridgeRequest) => {
    if (
      clusterManager &&
      clusterManager.state.role !== 'leader' &&
      clusterManager.state.leaderId &&
      clusterManager.state.leaderUrl
    ) {
      return clusterManager.requestLeaderRpc(request)
    }

    return executeBridgeRequest(runtime, request)
  }
  const mcpServer = createMcpBridge(handleBridgeRequest)

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

          queueStateStoreUpdate(stateStore?.setUpstreamProxyInactive())

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
          queueStateStoreUpdate(
            stateStore?.setUpstreamProxyFollowing({
              leaderId: state.leaderId,
              leaderUrl: state.leaderUrl,
              term: state.term
            })
          )
          return
        }

        queueStateStoreUpdate(
          stateStore?.setUpstreamProxyConnecting({
            leaderId: state.leaderId,
            leaderUrl: state.leaderUrl,
            term: state.term
          })
        )

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
        queueStateStoreUpdate(
          stateStore?.setUpstreamProxyFollowing({
            leaderId: state.leaderId,
            leaderUrl: state.leaderUrl,
            term: state.term
          })
        )
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
      handleRpcRequest: (request) => executeBridgeRequest(runtime, request as BridgeRequest),
      onStateChange: ({ state, roleChanged, leaderChanged }) => {
        queueStateStoreUpdate(stateStore?.setClusterState(state))
        if (roleChanged || leaderChanged) {
          queueProxyReconcile(state)
        }
      }
    })
  }

  transportServer = new MdpTransportServer(
    runtime,
    await toServerOptions(
      effectiveOptions,
      serverId,
      clusterManager
    )
  )

  try {
    await transportServer.start()
    queueStateStoreUpdate(stateStore?.setTransportListening(transportServer.endpoints))
    await mcpServer.connect(transport)
    queueStateStoreUpdate(stateStore?.setMcpBridgeConnected())
    await clusterManager?.start()
    if (clusterManager) {
      queueStateStoreUpdate(stateStore?.setClusterState(clusterManager.state))
    }
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
    await stateStore?.markStopped()
    throw error
  }

  const endpoints = transportServer.endpoints
  io.error(`MDP server listening on ${endpoints.ws}`)
  io.error(`MDP HTTP loop endpoint listening on ${endpoints.httpLoop}`)
  io.error(`MDP auth endpoint listening on ${endpoints.auth}`)
  io.error(`MDP meta endpoint listening on ${endpoints.meta}`)
  io.error(`MDP cluster endpoint listening on ${endpoints.cluster}`)
  if (stateStore) {
    io.error(`MDP state store writing to ${stateStore.storeDir}`)
  }

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
    await stateStore?.markStopped()
    process.exit(0)
  }

  process.on('SIGINT', () => {
    void shutdown()
  })

  process.on('SIGTERM', () => {
    void shutdown()
  })
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
