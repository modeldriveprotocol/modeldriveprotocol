import { setTimeout as delay } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'

import { defaults, paths } from '../config.mjs'
import { unwrapMcpToolResult } from '../shared/mcp-results.mjs'

export async function startRuntimeClient() {
  const runtimeModule = await import(pathToFileURL(paths.runtimeIndexPath).href)
  return await runtimeModule.bootNodejsSimpleMdpClient({
    serverUrl: defaults.serverUrl,
    workspaceRoot: paths.repoRoot,
    client: {
      id: defaults.runtimeClientId,
      name: 'MDP Test Runtime'
    }
  })
}

export async function waitForRuntimeClient(bridgeTools, clientId) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const result = await bridgeTools.listClients.execute(
      {},
      createToolExecutionOptions(`wait-${attempt}`)
    )
    const payload = unwrapMcpToolResult(result)
    const clients = Array.isArray(payload?.clients) ? payload.clients : []

    if (clients.some((client) => client?.id === clientId)) {
      return
    }

    await delay(250)
  }

  throw new Error(`Timed out waiting for MDP runtime client "${clientId}"`)
}

function createToolExecutionOptions(toolCallId) {
  return {
    messages: [],
    toolCallId
  }
}
