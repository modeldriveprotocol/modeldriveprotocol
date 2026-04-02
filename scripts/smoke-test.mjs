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
  args: [
    'packages/server/dist/cli.js',
    '--cluster-mode',
    'standalone',
    '--port',
    String(port)
  ],
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
    version: '1.0.0'
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
  .expose('/search-dom', {
    method: 'POST'
  }, async ({ body }, context) => ({
    query:
      body && typeof body === 'object' && !Array.isArray(body)
        ? body.query
        : undefined,
    matches: 3,
    authToken: context.auth?.token
  }))
  .expose('/summaries/prompt.md', {
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        tone: {
          type: 'string'
        }
      }
    }
  }, async ({ queries }) => ({
    messages: [
      {
        role: 'user',
        content: `Summarize the current selection in a ${queries.tone ?? 'neutral'} tone.`
      }
    ]
  }))
  .expose(
    '/page/review/files/skill.md',
    '# Review Files\n\nInspect `/workspace/review/files/download` for raw file output.'
  )
  .expose('/workspace/review/files/download', {
    method: 'GET',
    contentType: 'text/plain'
  }, async () => ({
    mimeType: 'text/plain',
    text: 'Selected text'
  }))

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
    listedTools.tools.some((tool) => tool.name === 'listPaths'),
    'MCP bridge should expose listPaths'
  )
  assert.ok(
    listedTools.tools.some((tool) => tool.name === 'callPath'),
    'MCP bridge should expose callPath'
  )
  assert.ok(
    listedTools.tools.some((tool) => tool.name === 'callPaths'),
    'MCP bridge should expose callPaths'
  )
  assert.deepEqual(
    listedTools.tools.map((tool) => tool.name).sort(),
    ['callPath', 'callPaths', 'listClients', 'listPaths']
  )

  const listClientsResult = await mcpClient.callTool({
    name: 'listClients',
    arguments: {}
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
  const searchedClientsResult = await mcpClient.callTool({
    name: 'listClients',
    arguments: {
      search: 'browser'
    }
  })
  assert.notEqual(searchedClientsResult.isError, true)
  assert.equal(searchedClientsResult.structuredContent?.clients?.length, 1)

  const defaultListPathsResult = await mcpClient.callTool({
    name: 'listPaths',
    arguments: {
      clientId: 'browser-01'
    }
  })
  assert.notEqual(defaultListPathsResult.isError, true)
  assert.equal(defaultListPathsResult.structuredContent?.paths?.length, 2)

  const searchedPathsResult = await mcpClient.callTool({
    name: 'listPaths',
    arguments: {
      clientId: 'browser-01',
      search: 'review/files'
    }
  })
  assert.notEqual(searchedPathsResult.isError, true)
  assert.equal(searchedPathsResult.structuredContent?.paths?.length, 2)
  assert.deepEqual(
    searchedPathsResult.structuredContent?.paths?.map((path) => path.path),
    ['/page/review/files/skill.md', '/workspace/review/files/download']
  )

  const listPathsResult = await mcpClient.callTool({
    name: 'listPaths',
    arguments: {
      clientId: 'browser-01',
      depth: Number.MAX_SAFE_INTEGER
    }
  })
  assert.notEqual(listPathsResult.isError, true)
  assert.equal(listPathsResult.structuredContent?.paths?.length, 4)

  const searchDomPath = findPath(listPathsResult.structuredContent?.paths, '/search-dom')
  const summarizeSelectionPath = findPath(
    listPathsResult.structuredContent?.paths,
    '/summaries/prompt.md'
  )
  const reviewSkillPath = findPath(
    listPathsResult.structuredContent?.paths,
    '/page/review/files/skill.md'
  )
  const selectionResourcePath = findPath(
    listPathsResult.structuredContent?.paths,
    '/workspace/review/files/download'
  )
  assert.equal(searchDomPath?.method, 'POST')
  assert.equal(summarizeSelectionPath?.type, 'prompt')
  assert.equal(reviewSkillPath?.type, 'skill')
  assert.equal(selectionResourcePath?.method, 'GET')

  const callPathResult = await mcpClient.callTool({
    name: 'callPath',
    arguments: {
      clientId: 'browser-01',
      method: 'POST',
      path: searchDomPath.path,
      body: {
        query: 'mdp'
      },
      auth: {
        token: 'host-token'
      }
    }
  })
  assert.notEqual(callPathResult.isError, true)
  assert.equal(callPathResult.structuredContent?.data?.matches, 3)
  assert.equal(callPathResult.structuredContent?.data?.authToken, 'host-token')

  const promptResult = await mcpClient.callTool({
    name: 'callPath',
    arguments: {
      clientId: 'browser-01',
      method: 'GET',
      path: summarizeSelectionPath.path,
      query: {
        tone: 'concise'
      }
    }
  })
  assert.notEqual(promptResult.isError, true)
  assert.equal(promptResult.structuredContent?.data?.messages?.[0]?.role, 'user')
  assert.match(promptResult.structuredContent?.data?.messages?.[0]?.content ?? '', /concise/)

  const callPathsResult = await mcpClient.callTool({
    name: 'callPaths',
    arguments: {
      method: 'POST',
      path: searchDomPath.path,
      body: {
        query: 'mdp'
      }
    }
  })
  assert.notEqual(callPathsResult.isError, true)
  assert.equal(callPathsResult.structuredContent?.results?.length, 1)
  assert.equal(callPathsResult.structuredContent?.results?.[0]?.clientId, 'browser-01')
  assert.equal(callPathsResult.structuredContent?.results?.[0]?.ok, true)
  assert.equal(callPathsResult.structuredContent?.results?.[0]?.data?.matches, 3)

  const skillResult = await mcpClient.callTool({
    name: 'callPath',
    arguments: {
      clientId: 'browser-01',
      method: 'GET',
      path: reviewSkillPath.path
    }
  })
  assert.notEqual(skillResult.isError, true)
  assert.match(skillResult.structuredContent?.data ?? '', /Review Files/)

  const resourceResult = await mcpClient.callTool({
    name: 'callPath',
    arguments: {
      clientId: 'browser-01',
      method: 'GET',
      path: selectionResourcePath.path
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

function findPath(paths, targetPath) {
  return paths?.find((path) => path?.path === targetPath)
}
