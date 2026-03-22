import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import net from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

import { createMdpClient } from '../packages/client/dist/index.js'

const port = await allocatePort()
const serverUrl = `http://127.0.0.1:${port}`
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['packages/server/dist/cli.js', '--port', String(port)],
  cwd: process.cwd(),
  stderr: 'pipe'
})

const stderrChunks = []

transport.stderr?.on('data', (chunk) => {
  stderrChunks.push(chunk.toString())
})

const mcpClient = new Client(
  {
    name: 'modeldriveprotocol-smoke-test',
    version: '0.1.0'
  },
  {
    capabilities: {}
  }
)

const mdpClient = createMdpClient({
  serverUrl,
  auth: {
    token: 'client-token'
  },
  client: {
    id: 'browser-01',
    name: 'Browser Client',
    description: 'Smoke-test client',
    platform: 'node'
  }
})

mdpClient
  .exposeTool('searchDom', async ({ query } = {}, context) => ({
    query,
    matches: 3,
    authToken: context.auth?.token
  }))
  .exposePrompt('summarizeSelection', async ({ tone } = {}) => ({
    messages: [
      {
        role: 'user',
        content: `Summarize the current selection in a ${tone ?? 'neutral'} tone.`
      }
    ]
  }))
  .exposeSkill('page/review', async () => ({
    findings: ['No issues found']
  }))
  .exposeResource('webpage://active-tab/selection', async () => ({
    mimeType: 'text/plain',
    text: 'Selected text'
  }), {
    name: 'Active Selection',
    mimeType: 'text/plain'
  })

try {
  const browserBundle = await readFile(
    new URL('../packages/client/dist/modeldriveprotocol-client.global.js', import.meta.url),
    'utf8'
  )
  assert.match(browserBundle, /var MDP =/)

  await mcpClient.connect(transport)
  await waitForServerReady(stderrChunks, port)

  const metaResponse = await fetch(`${serverUrl}/mdp/meta`)
  const metaPayload = await metaResponse.json()
  assert.equal(metaResponse.ok, true)
  assert.equal(metaPayload.protocol, 'mdp')
  assert.equal(metaPayload.endpoints.httpLoop, `${serverUrl}/mdp/http-loop`)

  await mdpClient.connect()
  mdpClient.register()
  await delay(150)

  const listedTools = await mcpClient.listTools()
  assert.ok(
    listedTools.tools.some((tool) => tool.name === 'listClients'),
    'MCP bridge should expose listClients'
  )
  assert.ok(
    listedTools.tools.some((tool) => tool.name === 'callTools'),
    'MCP bridge should expose callTools'
  )

  const listClientsResult = await mcpClient.callTool({
    name: 'listClients'
  })
  assert.notEqual(listClientsResult.isError, true)
  assert.equal(listClientsResult.structuredContent?.clients?.length, 1)
  assert.equal(
    listClientsResult.structuredContent?.clients?.[0]?.connection?.mode,
    'http-loop'
  )
  assert.equal(
    listClientsResult.structuredContent?.clients?.[0]?.connection?.authSource,
    'message'
  )

  const listRemoteToolsResult = await mcpClient.callTool({
    name: 'listTools',
    arguments: {}
  })
  assert.notEqual(listRemoteToolsResult.isError, true)
  assert.ok(
    listRemoteToolsResult.structuredContent?.tools?.some(
      (tool) => tool.clientId === 'browser-01' && tool.name === 'searchDom'
    ),
    'Bridge should list client-exposed tools'
  )

  const toolCallResult = await mcpClient.callTool({
    name: 'callTools',
    arguments: {
      clientId: 'browser-01',
      toolName: 'searchDom',
      args: {
        query: 'mdp'
      },
      auth: {
        token: 'host-token'
      }
    }
  })
  assert.notEqual(toolCallResult.isError, true)
  assert.equal(toolCallResult.structuredContent?.data?.matches, 3)
  assert.equal(toolCallResult.structuredContent?.data?.authToken, 'host-token')

  const promptResult = await mcpClient.callTool({
    name: 'getPrompt',
    arguments: {
      clientId: 'browser-01',
      promptName: 'summarizeSelection',
      args: {
        tone: 'concise'
      }
    }
  })
  assert.notEqual(promptResult.isError, true)
  assert.equal(promptResult.structuredContent?.data?.messages?.[0]?.role, 'user')

  const resourceResult = await mcpClient.callTool({
    name: 'readResource',
    arguments: {
      clientId: 'browser-01',
      uri: 'webpage://active-tab/selection'
    }
  })
  assert.notEqual(resourceResult.isError, true)
  assert.equal(resourceResult.structuredContent?.data?.text, 'Selected text')

  console.log('Smoke test passed')
} finally {
  await Promise.allSettled([mdpClient.disconnect(), mcpClient.close(), transport.close()])
}

async function waitForServerReady(stderrChunks, expectedPort) {
  const expectedLine = `http://127.0.0.1:${expectedPort}/mdp/http-loop`

  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (stderrChunks.join('').includes(expectedLine)) {
      return
    }

    await delay(50)
  }

  throw new Error(`Timed out waiting for server startup (${expectedLine})`)
}

async function allocatePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()

    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()

      if (!address || typeof address === 'string') {
        server.close(() => {
          reject(new Error('Unable to allocate an ephemeral smoke-test port'))
        })
        return
      }

      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve(address.port)
      })
    })
  })
}
