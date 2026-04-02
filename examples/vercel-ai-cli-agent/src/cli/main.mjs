import process from 'node:process'

import { createMCPClient } from '@ai-sdk/mcp'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { generateText, stepCountIs } from 'ai'

import { defaults, paths } from '../config.mjs'
import { createMockModel } from '../mock/model.mjs'
import { ensureLocalArtifacts } from '../mdp/artifacts.mjs'
import { startRuntimeClient, waitForRuntimeClient } from '../mdp/runtime-client.mjs'
import { normalizeArgv, renderHelpText } from './args.mjs'
import { compactLogs, extractFinalText } from '../shared/output.mjs'

const READ_PACKAGE_MANIFEST_PATH = '/workspace/package-manifest'

export async function main() {
  const argv = normalizeArgv(process.argv.slice(2))

  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(`${renderHelpText()}\n`)
    return
  }

  const userInput = argv.join(' ').trim()

  await ensureLocalArtifacts()

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [paths.serverCliPath, '--port', String(defaults.port)],
    cwd: paths.repoRoot,
    stderr: 'pipe'
  })

  const serverLogs = []
  transport.stderr?.on('data', (chunk) => {
    serverLogs.push(chunk.toString())
  })

  const mcpClient = await createMCPClient({
    name: defaults.mcpServer.name,
    version: defaults.mcpServer.version,
    transport
  })

  const bridgeTools = await mcpClient.tools()
  const runtimeClient = await startRuntimeClient()

  try {
    await waitForRuntimeClient(bridgeTools, defaults.runtimeClientId)

    const result = await generateText({
      model: createMockModel({
        userInput,
        runtimeClientId: defaults.runtimeClientId,
        packageManifestPath: READ_PACKAGE_MANIFEST_PATH
      }),
      tools: {
        callPath: bridgeTools.callPath
      },
      stopWhen: stepCountIs(5),
      prompt: userInput
    })

    process.stdout.write(`${extractFinalText(result)}\n`)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const debugLogs = compactLogs([
      ['server', serverLogs.join('')]
    ])

    throw new Error(debugLogs ? `${message}\n\n${debugLogs}` : message)
  }
  finally {
    await Promise.allSettled([
      runtimeClient.disconnect(),
      mcpClient.close()
    ])
  }
}
