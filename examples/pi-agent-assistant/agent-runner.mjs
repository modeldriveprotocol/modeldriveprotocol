import { dirname, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

import { Agent } from '@mariozechner/pi-agent-core'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { Type, getModel } from '@mariozechner/pi-ai'

const exampleDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(exampleDir, '../..')
const serverCliPath = resolve(repoRoot, 'packages/server/dist/cli.js')

const port = Number(process.env.MDP_PORT ?? 7070)
const serverUrl = `http://127.0.0.1:${port}`
const runtimeClientId = process.env.MDP_CLIENT_ID ?? 'pi-inbox-runtime'
const prompt = process.argv.slice(2).join(' ') ||
  'Review open tickets, read the playbook, and save a calm reply draft for the most urgent unresolved ticket.'
const provider = process.env.PI_MODEL_PROVIDER ?? 'openai'
const modelId = process.env.PI_MODEL_ID ?? 'gpt-4o-mini'

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverCliPath, '--port', String(port)],
  cwd: repoRoot,
  stderr: 'pipe'
})

const stderrChunks = []

transport.stderr?.on('data', (chunk) => {
  stderrChunks.push(chunk.toString())
})

const mcpClient = new Client(
  {
    name: 'mdp-pi-agent-example',
    version: '1.0.0'
  },
  {
    capabilities: {}
  }
)

try {
  await mcpClient.connect(transport)
  await waitForServerReady(port)
  await waitForRuntime(runtimeClientId)

  const agent = new Agent({
    initialState: {
      systemPrompt: [
        'You are handling a small support inbox that lives inside a browser runtime.',
        'Use the provided tools instead of making assumptions.',
        'Always read the reply playbook before saving a draft.',
        'When you pick a ticket, explain why it is the highest priority.',
        'Before you finish, call save_ticket_draft with the final reply.'
      ].join(' '),
      model: getModel(provider, modelId),
      thinkingLevel: 'minimal',
      messages: [],
      tools: createInboxTools(runtimeClientId)
    },
    convertToLlm: (messages) =>
      messages.filter(
        (message) =>
          message.role === 'user' ||
          message.role === 'assistant' ||
          message.role === 'toolResult'
      )
  })

  agent.subscribe((event) => {
    if (
      event.type === 'message_update' &&
      event.assistantMessageEvent.type === 'text_delta'
    ) {
      process.stdout.write(event.assistantMessageEvent.delta)
    }

    if (event.type === 'tool_execution_start') {
      process.stderr.write(`\n[tool:start] ${event.toolName}\n`)
    }

    if (event.type === 'tool_execution_end') {
      process.stderr.write(`\n[tool:end] ${event.toolCallId}\n`)
    }
  })

  process.stderr.write(
    `Connected to ${serverUrl} and found runtime "${runtimeClientId}". Using ${provider}/${modelId}.\n\n`
  )
  await agent.prompt(prompt)
  process.stdout.write('\n')
} finally {
  await Promise.allSettled([mcpClient.close(), transport.close()])
}

function createInboxTools(clientId) {
  return [
    {
      name: 'list_inbox_tickets',
      label: 'List Inbox Tickets',
      description: 'List support tickets from the MDP browser runtime.',
      parameters: Type.Object({
        status: Type.Optional(
          Type.String({ description: 'Optional filter such as open or closed.' })
        )
      }),
      execute: async (_toolCallId, params = {}) => {
        const data = await callRemoteTool(clientId, 'listTickets', params)
        return toAgentResult(data)
      }
    },
    {
      name: 'read_ticket',
      label: 'Read Ticket',
      description: 'Fetch the full thread, severity, and current draft for one ticket.',
      parameters: Type.Object({
        ticketId: Type.String({ description: 'Ticket ID like T-102.' })
      }),
      execute: async (_toolCallId, params) => {
        const data = await callRemoteTool(clientId, 'getTicket', params)
        return toAgentResult(data)
      }
    },
    {
      name: 'read_reply_playbook',
      label: 'Read Reply Playbook',
      description: 'Read the support-team playbook stored as an MDP resource.',
      parameters: Type.Object({}),
      execute: async () => {
        const data = await readRemoteResource(clientId, 'inbox://support/playbook')
        return {
          content: [{ type: 'text', text: data.text }],
          details: { mimeType: data.mimeType, uri: 'inbox://support/playbook' }
        }
      }
    },
    {
      name: 'save_ticket_draft',
      label: 'Save Ticket Draft',
      description: 'Persist a reply draft back into the browser runtime.',
      parameters: Type.Object({
        ticketId: Type.String({ description: 'Ticket ID like T-102.' }),
        draft: Type.String({ description: 'The reply draft to save.' })
      }),
      execute: async (_toolCallId, params) => {
        const data = await callRemoteTool(clientId, 'saveDraft', {
          ...params,
          author: 'pi-agent'
        })
        return toAgentResult(data)
      }
    }
  ]
}

async function callRemoteTool(clientId, toolName, args) {
  const result = await mcpClient.callTool({
    name: 'callTools',
    arguments: {
      clientId,
      toolName,
      ...(args ? { args } : {})
    }
  })

  return unwrapInvocation(result)
}

async function readRemoteResource(clientId, uri) {
  const result = await mcpClient.callTool({
    name: 'readResource',
    arguments: {
      clientId,
      uri
    }
  })

  return unwrapInvocation(result)
}

function unwrapInvocation(result) {
  if (result.isError) {
    throw new Error(result.content?.[0]?.text ?? 'Bridge invocation failed')
  }

  if (!result.structuredContent || result.structuredContent.ok !== true) {
    throw new Error(
      JSON.stringify(result.structuredContent ?? { message: 'Missing bridge payload' }, null, 2)
    )
  }

  return result.structuredContent.data
}

function toAgentResult(data) {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    details: data
  }
}

async function waitForServerReady(expectedPort) {
  const expectedLine = `http://127.0.0.1:${expectedPort}/mdp/http-loop`

  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (stderrChunks.join('').includes(expectedLine)) {
      return
    }

    await delay(50)
  }

  throw new Error(`Timed out waiting for MDP server startup (${expectedLine})`)
}

async function waitForRuntime(clientId) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const result = await mcpClient.callTool({
      name: 'listClients'
    })

    if (!result.isError && result.structuredContent?.clients?.some((client) => client.id === clientId)) {
      return
    }

    await delay(500)
  }

  throw new Error(
    `Timed out waiting for runtime "${clientId}". Open the browser example and keep the tab connected.`
  )
}
